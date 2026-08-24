import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * 载具外观管线。三步顺序固定为 smoothModel → paintModel → curveModel，一步都不能换：
 * 平滑会重建几何（返回非索引），上色随后在这份**原始网格**上分件重排（阈值和 span 判定
 * 都是照原始三角面量的），细分放最后，部件边界因此还落在原来的棱上。
 * 等细分完再分件，边界会按子三角面重切成锯齿。
 */

/** 逐面判定用的三元组。同一个对象每面复用，避免 12k 面各分配一次。 */
type Vec = { x: number; y: number; z: number };

/**
 * 三角面自身的跨度。低模的面很大时按重心切会切出锯齿边、或在色块中间留下尖角，
 * 改用这个整片归类，边界就落回网格自己的棱上。
 * min/max 是相对高度 0..1 的上下界，ax 是三个顶点里最靠内的 |x|（u 空间）。
 */
type Span = { min: number; max: number; ax: number };

export type PaintRole =
  | "body" | "bodyDark" | "structure" | "rubber" | "rim" | "metal" | "glass" | "shell" | "belly" | "navy";

/**
 * 语义部件调色板，取色沿用列车 GLB 里那套 map_* 材质，让上色后的模型和列车同一视觉体系。
 * color 为 null 表示取这台载具自己的车身漆色（paintColor）。
 */
const PAINT_PALETTE: Record<PaintRole, { color: string | null; roughness: number; metalness: number }> = {
  body: { color: null, roughness: .52, metalness: .14 },
  bodyDark: { color: "#2b3a44", roughness: .7, metalness: .08 },
  structure: { color: "#1d1d1f", roughness: .78, metalness: .06 },
  rubber: { color: "#17191c", roughness: .95, metalness: 0 },
  rim: { color: "#c9d0d6", roughness: .34, metalness: .62 },
  metal: { color: "#aeb6be", roughness: .42, metalness: .48 },
  glass: { color: "#86cfe6", roughness: .2, metalness: .12 },
  shell: { color: "#f7f8fa", roughness: .48, metalness: .05 },  // 珠白外壳：游艇上层建筑 / ANA 机身
  belly: { color: "#c2c9d0", roughness: .5, metalness: .24 },   // ANA 浅灰机腹
  navy: { color: "#1f3f91", roughness: .42, metalness: .12 },   // ANA 深蓝垂尾与尾锥
};

type Hub = { y: number; z: number };

export type PaintName = "sportscar" | "airplane" | "sailboat";

type PaintRule = {
  /**
   * 轮心（u 空间的 y/z，轮盘法线是模型自身的 X 轴）。给了这一项，paintModel 就把轮子的面
   * 拆成能绕轮轴自转的子网格 `wheel-<n>`；同一根轴上的左右轮共用一个子网格 —— 它们绕的是
   * 同一条轴、转的是同一个角，没必要分开。
   */
  wheels?: Hub[];
  /** 这个面属于第几组轮子，-1 表示不属于任何轮。必须和 classify 里的轮子判定同源。 */
  wheelOf?: (p: Vec) => number;
  classify: (p: Vec, h: number, n: Vec, span: Span) => PaintRole;
};

/** 最近轮心。返回的是复用对象，取完值就用掉，别存引用。 */
const nearest = { index: -1, distance: Infinity };
function nearestHub(wheels: Hub[], p: Vec) {
  nearest.index = -1;
  nearest.distance = Infinity;
  for (let index = 0; index < wheels.length; index += 1) {
    const distance = Math.hypot(p.y - wheels[index].y, p.z - wheels[index].z);
    if (distance < nearest.distance) {
      nearest.distance = distance;
      nearest.index = index;
    }
  }
  return nearest;
}

const SPORTSCAR_HUBS: Hub[] = [{ y: .076, z: -.269 }, { y: .076, z: .276 }];

/**
 * 预处理把这几个模型压成了单网格单材质，部件名和材质槽都没留下，按名字匹配全部落空，
 * 只能刷成一整片主色 —— 这几条规则按几何位置把三角面重新归类到语义部件。
 *
 * classify 收到的坐标已除以模型最长轴（u 空间，等比缩放），圆形部件的半径判定不会被
 * 非等比归一化拉扁；h 是相对高度 0..1；n 是三角面的**几何法线（叉积算的）**——不能用顶点
 * 法线，smoothModel 已经把车顶和侧窗交界处的顶点法线平均到一起了，拿它判定会把窗玻璃误判
 * 成车顶盖。阈值来自各 GLB 的实测局部坐标，**换模型文件就要重新量**。
 */
const PAINT_RULES: Record<PaintName, PaintRule> = {
  // 车轮：X 两侧、YZ 平面上半径 0.068u 的圆盘，轮心 Z=∓0.27u。
  // 玻璃取「腰线以上、车顶盖以下（h<0.93）、内收的非水平面」，车顶盖靠 n.y < .93 挡在外面。
  // 下界 0.66 是量出来的腰线：再低会从轮顶开始把整条腰线和车门侧板刷成浅蓝。
  // 内收界用 span.ax（面最内侧顶点的 |x|）而不是重心：侧窗玻璃本身外凸，减面后一批细长
  // 三角面的重心已经越过车厢宽度，按重心切会在浅蓝玻璃里留下红色尖角；改判「这个面有没有
  // 一角伸进车厢宽度内」，边界就落回网格自己的棱上。0.163 的上限把后视镜留在车身色里。
  sportscar: {
    wheels: SPORTSCAR_HUBS,
    wheelOf: (p) => Math.abs(p.x) > .17 && nearestHub(SPORTSCAR_HUBS, p).distance < .068 ? nearest.index : -1,
    classify(p, h, n, span) {
      if (Math.abs(p.x) > .17 && nearestHub(SPORTSCAR_HUBS, p).distance < .068) {
        return nearest.distance < .037 ? "rim" : "rubber";
      }
      if (h < .10) return "structure";
      if (h > .66 && h < .93 && n.y < .93 && span.ax < .163) return "glass";
      return "body";
    },
  },
  // ANA 涂装：珠白机身 + 浅灰机腹 + 浅灰机翼 + 深蓝垂尾尾锥 + 白色发动机吊舱。
  // 实测（机头在 +Z、机尾在 -Z）：机身半宽 0.055u；垂尾是 |x|<0.003u 的一片薄中线面，
  // z -0.50..-0.34、h 0.56..1.00；平尾 z<-0.30、h 0.30..0.50、|x| 到 0.148；
  // 主翼 z -0.16..-0.02、|x| 到 0.472、h 0.29..0.49；吊舱 |x| 0.08..0.23、h<0.29；
  // 主起落架 h<0.085、|x| 0.055..0.10，前起落架在中线、z>0.33。
  // 判定顺序有意义：先摘掉起落架和吊舱，剩下 |x|>0.055 的才是翼面。
  airplane: {
    classify(p, h) {
      const ax = Math.abs(p.x);
      if (h < .085 && ax > .055 && ax < .10) return "rubber";
      if (h < .09 && ax < .025 && p.z > .30) return "rubber";
      if (ax > .07 && h < .29) return "shell";
      if (ax > .055) return "metal";
      if (p.z < -.25 && h > .28) return "navy";
      if (h < .24) return "belly";
      return "shell";
    },
  },
  // 这个 GLB 实际是艘游艇（无桅无帆，长轴在 X、船头在 +X）：象牙白船身 + 珠白上层建筑 + 深色水线。
  // 两层白靠冷暖区分（船身偏暖、上层建筑偏冷），水线压深给象牙白一个落脚的底。
  // 全模型只有 2320 面，上层建筑的三角面很大，按重心高度切会切出交错的锯齿边；
  // 所以用 span.max（面的最高顶点）：只要有一角伸到甲板以上就整片归上层建筑，边界落在
  // 网格自己的棱上。翘起的艏舷整片都在 0.62 以下，仍留船身色。
  sailboat: {
    classify(p, h, n, span) {
      if (span.max > .62) return "shell";
      if (h < .16) return "bodyDark";
      return "body";
    },
  },
};

const paintCache = new Map<string, THREE.MeshStandardMaterial>();
function paintMaterial(role: PaintRole, paintColor: string) {
  const spec = PAINT_PALETTE[role];
  const color = spec.color ?? paintColor;
  const key = `${role}|${color}`;
  const cached = paintCache.get(key);
  if (cached) return cached;
  // DoubleSide 是必须的：这几个模型都是没有厚度的单层壳体，游艇的船壳和敞开甲板尤其明显。
  // 默认 FrontSide 会把朝内的面剔掉，从舷侧一路看穿到船内，看上去就是「船是透明的」。
  const material = new THREE.MeshStandardMaterial({
    color, roughness: spec.roughness, metalness: spec.metalness, side: THREE.DoubleSide,
  });
  paintCache.set(key, material);
  return material;
}

/** 收集网格再处理，不在 traverse 回调里改结构 —— 拆轮子会往 children 里塞新网格。 */
function meshesOf(root: THREE.Object3D) {
  const list: THREE.Mesh[] = [];
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) list.push(object as THREE.Mesh);
  });
  return list;
}

function nonIndexed(geometry: THREE.BufferGeometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!source.attributes.normal) source.computeVertexNormals();
  return source;
}

/**
 * GLB 里这几个模型的法线全是逐面烘死的（同一位置上的法线 80~99% 互不相同），
 * 单把 flatShading 关掉不会变平滑，得按位置焊接顶点重算法线。toCreasedNormals 按夹角处理：
 * 缓曲面（车身钣金、机身筒、船壳）平滑掉，超过 creaseAngle 的真折边（保险杠棱线、翼根、
 * 舷缘、车窗框）仍保留硬边，不会糊成一团。它返回非索引几何，正好是 paintModel 分件要的形式。
 */
export function smoothModel(root: THREE.Object3D, creaseAngle = Math.PI * 65 / 180) {
  for (const mesh of meshesOf(root)) {
    mesh.geometry = toCreasedNormals(mesh.geometry, creaseAngle);
  }
}

/**
 * 把单材质网格按部件重排成多材质组：先给每个三角面判角色，再按角色把面聚到一起，
 * 每段挂一个 addGroup + 对应材质。带 wheels 的规则会把轮子的面拆成独立子网格，
 * 命名 `wheel-<n>`、原点落在轮轴上，调用方绕它自己的 X 轴转就是原地滚。
 * 返回各角色的面数，便于校验规则是否落在预期部件上。
 */
export function paintModel(root: THREE.Object3D, options: { paint: PaintName; paintColor: string }) {
  const rule = PAINT_RULES[options.paint];
  const tally: Record<string, number> = {};
  for (const object of meshesOf(root)) {
    const geometry = nonIndexed(object.geometry);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    const unit = Math.max(size.x, size.y, size.z) || 1;
    const centerX = (box.min.x + box.max.x) / 2;
    const centerZ = (box.min.z + box.max.z) / 2;
    const position = geometry.attributes.position as THREE.BufferAttribute;
    const faces = Math.floor(position.count / 3);

    // 键是 `角色` 或 `角色#轮组`，后者会被拆到子网格里去。
    const buckets = new Map<string, number[]>();
    const point: Vec = { x: 0, y: 0, z: 0 };
    const face: Vec = { x: 0, y: 0, z: 0 };
    const span: Span = { min: 0, max: 0, ax: 0 };
    const vx = [0, 0, 0], vy = [0, 0, 0], vz = [0, 0, 0];
    for (let index = 0; index < faces; index += 1) {
      const a = index * 3;
      let x = 0, y = 0, z = 0, lo = Infinity, hi = -Infinity, inner = Infinity;
      for (let v = 0; v < 3; v += 1) {
        vx[v] = position.getX(a + v);
        vy[v] = position.getY(a + v);
        vz[v] = position.getZ(a + v);
        if (vy[v] < lo) lo = vy[v];
        if (vy[v] > hi) hi = vy[v];
        const ax = Math.abs(vx[v] - centerX);
        if (ax < inner) inner = ax;
        x += vx[v]; y += vy[v]; z += vz[v];
      }
      point.x = (x / 3 - centerX) / unit;
      point.y = (y / 3 - box.min.y) / unit;
      point.z = (z / 3 - centerZ) / unit;
      // 几何法线 = (v1-v0) × (v2-v0)，three.js 正面是逆时针，叉积朝外。
      const e1x = vx[1] - vx[0], e1y = vy[1] - vy[0], e1z = vz[1] - vz[0];
      const e2x = vx[2] - vx[0], e2y = vy[2] - vy[0], e2z = vz[2] - vz[0];
      const fx = e1y * e2z - e1z * e2y;
      const fy = e1z * e2x - e1x * e2z;
      const fz = e1x * e2y - e1y * e2x;
      const length = Math.hypot(fx, fy, fz) || 1;
      face.x = fx / length; face.y = fy / length; face.z = fz / length;
      const height = (y / 3 - box.min.y) / (size.y || 1);
      span.min = (lo - box.min.y) / (size.y || 1);
      span.max = (hi - box.min.y) / (size.y || 1);
      span.ax = inner / unit;
      const role = rule.classify(point, height, face, span);
      const wheel = rule.wheelOf ? rule.wheelOf(point) : -1;
      const key = wheel < 0 ? role : `${role}#${wheel}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(index);
      else buckets.set(key, [index]);
      tally[key] = (tally[key] || 0) + 1;
    }

    // 主网格拿不属于任何轮子的面，每组轮子各拿一份，都按角色分段登记。
    const keys = [...buckets.keys()];
    const build = (chosen: string[]) => {
      const next = new THREE.BufferGeometry();
      for (const name of Object.keys(geometry.attributes)) {
        const source = geometry.attributes[name] as THREE.BufferAttribute;
        const items = source.itemSize;
        // 所有属性都是 toNonIndexed 之后的定型数组，构造器只需要长度。
        const Ctor = source.array.constructor as Float32ArrayConstructor;
        const target = new Ctor(chosen.reduce((total, key) => total + buckets.get(key)!.length, 0) * 3 * items);
        let write = 0;
        for (const key of chosen) {
          for (const index of buckets.get(key)!) {
            for (let v = 0; v < 3; v += 1) {
              const read = (index * 3 + v) * items;
              for (let c = 0; c < items; c += 1) target[write++] = source.array[read + c];
            }
          }
        }
        next.setAttribute(name, new THREE.BufferAttribute(target, items, source.normalized));
      }
      let start = 0;
      chosen.forEach((key, slot) => {
        const count = buckets.get(key)!.length * 3;
        next.addGroup(start, count, slot);
        start += count;
      });
      return { geometry: next, materials: chosen.map((key) => paintMaterial(key.split("#")[0] as PaintRole, options.paintColor)) };
    };

    const main = build(keys.filter((key) => !key.includes("#")));
    object.geometry = main.geometry;
    object.material = main.materials;

    (rule.wheels ?? []).forEach((hub, index) => {
      const chosen = keys.filter((key) => key.endsWith(`#${index}`));
      if (!chosen.length) return;
      const built = build(chosen);
      // 轮心的局部坐标是 u 空间判定的逆运算。几何平移到轮轴上、网格再挪回去，
      // 于是绕子网格自己的 X 轴转就是原地滚，而不是绕车身中心甩。
      const hubY = hub.y * unit + box.min.y;
      const hubZ = hub.z * unit + centerZ;
      built.geometry.translate(0, -hubY, -hubZ);
      const wheel = new THREE.Mesh(built.geometry, built.materials);
      wheel.name = `wheel-${index}`;
      wheel.position.set(0, hubY, hubZ);
      object.add(wheel);
    });
  }
  return tally;
}

/**
 * 平滑法线只骗过了明暗：三角面本身还是平的，轮廓线和高光边缘仍然是折线。
 * curveModel 用 Phong 细分（Boubekeur & Alexa, 2008）把平面片换成真曲面片——在三角面内按
 * 重心坐标撒点，把每个点分别投影到三个顶点的**切平面**上再按重心权重混回来，得到的点就落在
 * 顶点法线所描述的那张曲面上，轮廓随之变圆。新顶点法线取重心插值后的 Phong 法线，相邻子面
 * 在共用位置上取到同一个值，着色因此仍然连续。
 *
 * - alpha 是曲面权重，1 是纯 Phong，压到 .72 是为了让减面留下的细长三角面不鼓包。
 * - 细分级数按夹角自适应：本来就平的面（最相近的一对顶点法线夹角 < smallAngle）原样保留，
 *   < bigAngle 的切 2×2，其余 3×3。面数只涨在真正弯的地方。
 * - 折边顶点锁定（见 creaseMask）：两侧算出的是同一条直线，接缝水密不裂，只有面片中间鼓起来。
 * - 几何带 groups 时按 group 逐段细分并重新 addGroup —— 分件上色的色块全靠 group 分段，
 *   重建几何时漏登记就会塌成一色。
 */
export function curveModel(root: THREE.Object3D, { smallAngle = 9, bigAngle = 32, alpha = .72 } = {}) {
  const cosSmall = Math.cos(smallAngle * Math.PI / 180);
  const cosBig = Math.cos(bigAngle * Math.PI / 180);
  let before = 0;
  let after = 0;
  for (const object of meshesOf(root)) {
    const source = nonIndexed(object.geometry);
    const position = (source.attributes.position as THREE.BufferAttribute).array;
    const normal = (source.attributes.normal as THREE.BufferAttribute).array;
    const faces = Math.floor(source.attributes.position.count / 3);
    const locked = creaseMask(source);
    before += faces;

    // 除 position / normal 之外的属性（uv 等）走线性重心插值原样带过去。
    const extras = Object.keys(source.attributes)
      .filter((key) => key !== "position" && key !== "normal")
      .map((key) => ({ key, attribute: source.attributes[key] as THREE.BufferAttribute, out: [] as number[] }));
    const outPosition: number[] = [];
    const outNormal: number[] = [];
    let written = 0;

    // 重心权重 (w0,w1,w2) 处的 Phong 采样点；a 是原三角面第一个顶点的下标。
    const sample = (a: number, w0: number, w1: number, w2: number) => {
      const weights = [w0, w1, w2];
      let lx = 0, ly = 0, lz = 0;                 // 线性点
      for (let v = 0; v < 3; v += 1) {
        lx += weights[v] * position[(a + v) * 3];
        ly += weights[v] * position[(a + v) * 3 + 1];
        lz += weights[v] * position[(a + v) * 3 + 2];
      }
      let cx = 0, cy = 0, cz = 0;                 // 曲面点：投到三个切平面再按同一组权重混合
      let nx = 0, ny = 0, nz = 0;
      let weight = 0;                             // 曲面权重按顶点插值：折边顶点贡献 0
      for (let v = 0; v < 3; v += 1) {
        const px = position[(a + v) * 3], py = position[(a + v) * 3 + 1], pz = position[(a + v) * 3 + 2];
        const vnx = normal[(a + v) * 3], vny = normal[(a + v) * 3 + 1], vnz = normal[(a + v) * 3 + 2];
        const drop = (lx - px) * vnx + (ly - py) * vny + (lz - pz) * vnz;
        cx += weights[v] * (lx - drop * vnx);
        cy += weights[v] * (ly - drop * vny);
        cz += weights[v] * (lz - drop * vnz);
        nx += weights[v] * vnx; ny += weights[v] * vny; nz += weights[v] * vnz;
        if (!locked[a + v]) weight += weights[v];
      }
      weight *= alpha;
      outPosition.push(lx + (cx - lx) * weight, ly + (cy - ly) * weight, lz + (cz - lz) * weight);
      const length = Math.hypot(nx, ny, nz) || 1;
      outNormal.push(nx / length, ny / length, nz / length);
      for (const extra of extras) {
        const items = extra.attribute.itemSize;
        for (let c = 0; c < items; c += 1) {
          let value = 0;
          for (let v = 0; v < 3; v += 1) value += weights[v] * extra.attribute.array[(a + v) * items + c];
          extra.out.push(value);
        }
      }
    };

    const subdivide = (a: number) => {
      // 三对顶点法线里最大的夹角决定细分档位：越弯分得越细。
      let worst = 1;
      for (let i = 0; i < 3; i += 1) {
        const j = (i + 1) % 3;
        const dot = normal[(a + i) * 3] * normal[(a + j) * 3]
          + normal[(a + i) * 3 + 1] * normal[(a + j) * 3 + 1]
          + normal[(a + i) * 3 + 2] * normal[(a + j) * 3 + 2];
        if (dot < worst) worst = dot;
      }
      // 三个角全在折边上的面弯不起来（位移处处为 0），细分纯属浪费面数。
      const pinned = locked[a] && locked[a + 1] && locked[a + 2];
      if (pinned || worst > cosSmall) {            // 钉死或够平，原样搬过去
        for (let v = 0; v < 3; v += 1) {
          outPosition.push(position[(a + v) * 3], position[(a + v) * 3 + 1], position[(a + v) * 3 + 2]);
          outNormal.push(normal[(a + v) * 3], normal[(a + v) * 3 + 1], normal[(a + v) * 3 + 2]);
          for (const extra of extras) {
            const items = extra.attribute.itemSize;
            for (let c = 0; c < items; c += 1) extra.out.push(extra.attribute.array[(a + v) * items + c]);
          }
        }
        written += 1;
        return;
      }
      // 重心格点 (i, j) → 权重 (1-i/k-j/k, i/k, j/k)，共 k² 个子三角面。
      // 绕向必须和原三角面一致，反了背面剔除会在模型上挖洞。
      const k = worst > cosBig ? 2 : 3;
      const emit = (grid: number[]) => {
        for (let v = 0; v < 3; v += 1) {
          const b = grid[v * 2] / k;
          const c = grid[v * 2 + 1] / k;
          sample(a, 1 - b - c, b, c);
        }
        written += 1;
      };
      for (let i = 0; i < k; i += 1) {
        for (let j = 0; j < k - i; j += 1) {
          emit([i, j, i + 1, j, i, j + 1]);
          if (i + j < k - 1) emit([i + 1, j, i + 1, j + 1, i, j + 1]);
        }
      }
    };

    const groups = source.groups.length
      ? source.groups.map((group) => ({ from: Math.floor(group.start / 3), count: Math.floor(group.count / 3), materialIndex: group.materialIndex ?? 0 }))
      : [{ from: 0, count: faces, materialIndex: 0 }];
    const outGroups: Array<{ start: number; count: number; materialIndex: number }> = [];
    for (const group of groups) {
      const start = written;
      for (let face = group.from; face < group.from + group.count; face += 1) subdivide(face * 3);
      outGroups.push({ start: start * 3, count: (written - start) * 3, materialIndex: group.materialIndex });
    }
    after += written;

    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.Float32BufferAttribute(outPosition, 3));
    next.setAttribute("normal", new THREE.Float32BufferAttribute(outNormal, 3));
    for (const extra of extras) {
      next.setAttribute(extra.key, new THREE.Float32BufferAttribute(extra.out, extra.attribute.itemSize));
    }
    if (source.groups.length) outGroups.forEach((group) => next.addGroup(group.start, group.count, group.materialIndex));
    object.geometry.dispose();
    object.geometry = next;
  }
  return { before, after };
}

/**
 * 标出折边顶点。smoothModel 只改法线不动位置，所以硬折边上的同一个坐标会留下多份法线互不
 * 相同的顶点副本，而缓曲面上的副本法线已经被焊成同一个值 —— 据此逐顶点打锁，curveModel
 * 在这些顶点上把位移压到 0。坐标按模型对角线的 1e-4 量化后分桶，避免不同量级的模型
 * （游艇 3.3、飞机 2498）用同一个绝对精度。
 */
function creaseMask(geometry: THREE.BufferGeometry) {
  const position = (geometry.attributes.position as THREE.BufferAttribute).array;
  const normal = (geometry.attributes.normal as THREE.BufferAttribute).array;
  const count = geometry.attributes.position.count;
  geometry.computeBoundingBox();
  const diagonal = geometry.boundingBox!.min.distanceTo(geometry.boundingBox!.max) || 1;
  const scale = 1e4 / diagonal;
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < count; i += 1) {
    const key = `${Math.round(position[i * 3] * scale)},${Math.round(position[i * 3 + 1] * scale)},${Math.round(position[i * 3 + 2] * scale)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }
  const locked = new Uint8Array(count);
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    let split = false;
    for (let i = 1; i < bucket.length && !split; i += 1) {
      const dot = normal[bucket[0] * 3] * normal[bucket[i] * 3]
        + normal[bucket[0] * 3 + 1] * normal[bucket[i] * 3 + 1]
        + normal[bucket[0] * 3 + 2] * normal[bucket[i] * 3 + 2];
      if (dot < .999) split = true;
    }
    if (split) for (const index of bucket) locked[index] = 1;
  }
  return locked;
}

/**
 * GLB 自带多色材质的模型（列车）不重新上色，只压平：
 * 车窗原本带 alpha，压成不透明实体面，不会再透出内壁和对侧车窗；一律 DoubleSide 同上。
 */
export function flattenMaterials(root: THREE.Object3D) {
  for (const object of meshesOf(root)) {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const item of materials) {
      const material = item as THREE.MeshStandardMaterial;
      material.flatShading = false;
      material.roughness = Math.max(material.roughness ?? .6, .4);
      material.metalness = Math.min(material.metalness ?? .05, .18);
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    }
  }
}
