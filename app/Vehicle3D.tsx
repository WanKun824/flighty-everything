"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { curveModel, flattenMaterials, paintModel, smoothModel, type PaintName } from "./vehicleShading";
import { vehicleStageMotion } from "./vehicleMotion";

export type VehicleKind = "flight" | "car" | "train" | "ferry";

/**
 * 机位。map 让屏幕上方正对场景 +Y，航向能一比一读出来；
 * hero 是面板里的 3/4 侧视，只管好看，不承载航向信息。
 */
export type VehicleView = "hero" | "map";

type Vehicle3DProps = {
  kind: VehicleKind;
  progress?: number;
  className?: string;
  /** 屏幕方位角，0 为正上方，顺时针递增。只有地图上的载具会传。 */
  heading?: number;
  /** 播放倍速，1 为基准。各载具按自己的跟随系数把它折进动作频率。 */
  rate?: number;
  view?: VehicleView;
  onReady?: (kind: VehicleKind) => void;
  retryToken?: number;
};

const LABELS: Record<VehicleKind, string> = {
  flight: "飞机",
  car: "汽车",
  train: "火车",
  ferry: "轮船",
};

type VehicleAsset = {
  url: string;
  /**
   * 模型在自身坐标系里的「前」和「上」。四个 GLB 都是 Y-up，但长轴不一致：
   * 判据来自各自的实测包围盒与 vehicleShading 里那套分件阈值（阈值本身就是照这个朝向量的）。
   */
  forward: THREE.Vector3Tuple;
  up: THREE.Vector3Tuple;
  /** 分件上色规则。这几个 GLB 被预处理压成了单网格且**不带任何材质**，不上色就是一片纯白。 */
  paint?: PaintName;
  /** 车身漆色。UI 用的 transportMeta.color 是另一套 —— 象牙白船身当路线线颜色会看不见。 */
  paintColor?: string;
  /** GLB 自带多色材质，不重新上色，只压平透明通道。 */
  preserveMaterials?: boolean;
  /** 平滑的折边夹角（度），缺省 65。 */
  crease?: number;
  /**
   * 横向加宽，做「可爱风」的矮胖比例。只能动宽度这一个方向：轮子是绕轮轴的圆盘，
   * 沿轴向缩放只让轮胎变厚（Q 版正好要胖轮胎），压长或拉高都会把轮子拉成椭圆。
   */
  widen?: number;
  /**
   * 取景余量倍率，>1 就是把相机再拉远、载具在画面里更小。
   * 归一化把四种载具的最长轴都撑满取景框，跑车于是和列车一样长；这个系数用来找回一点体型差。
   * 改模型缩放是没用的 —— 取景是逐实例自适应的，缩得再小相机也会跟着凑近。
   */
  frame?: number;
};

const ASSETS: Record<VehicleKind, VehicleAsset> = {
  // 经典飞机模型：机身长轴在 Z、机头在 +Z，翼展 2357 < 机身 2498。ANA 涂装按几何分件刷。
  flight: { url: "/models/legacy-plane.glb", forward: [0, 0, 1], up: [0, 1, 0], paint: "airplane" },
  // 保时捷跑车：车长在 Z（4.51）、车宽在 X（1.98）。车头在 +Z —— 后轮半轮距 .207u 宽于前轮 .197u，
  // 宽的那一端是车尾（911 的后轮距本来就更宽）。
  // 取景余量 1.45：归一化让跑车和列车一样长，得把相机拉远才看得出体型差。实测车身红漆的包围盒
  // （载具卡宽 516px）：1.22 档 240px → 1.45 档 207px，画面尺寸与 frame 成反比。
  // 漆色比 UI 那套 transportMeta.color（#ff453a）更深更纯：场景是 ACES + 曝光 1.12 + 环境 1.15，
  // 车身受照度远超 1，亮色漆的三个通道会一起顶到高光区被压成三文鱼粉。把绿蓝压到接近零，
  // 红通道再怎么过曝也带不动它们，出来才是鲜红。实测（展厅固定机位、四帧均值）：均值 RGB
  // 从 (242.5, 112.4, 93.3) 变成 (240.5, 69.6, 58.8)，屏幕饱和度 (max-min)/max 0.62 → 0.76 ——
  // 红通道本来就顶满 255 动不了，鲜艳度全是从压掉绿蓝里拿的。
  // widen 1.24 → 1.08 的效果只能在 map 机位量（仰角 50°）：投影次轴 89.8 → 82.0px（−8.6%），
  // 次/主轴比 0.532 → 0.481。名义上窄了 12.9%，投影里少一截是因为次轴还含车身高度的贡献。
  // 别在 hero 机位量宽度：那儿仰角 24°，次轴九成来自车高，13% 的变窄摊进去只剩 1%，
  // 而且取景是逐实例自适应的 —— 车一窄相机就自动靠近补偿，绝对尺寸反而变大。
  car: { url: "/models/porsche.glb", forward: [0, 0, 1], up: [0, 1, 0], paint: "sportscar", paintColor: "#f5140a", widen: 1.08, frame: 1.45 },
  // 城际列车：车长在 Z（29.7），GLB 自带 map_body/map_glass/… 六色材质，只压平不重上色。
  // 司机室在 -Z（map_warning 和 map_stop 两种材质只出现在 z = -0.5 那一端，map_accent 顶点也是
  // -Z 端 89 : +Z 端 12），所以要掉头让车头领跑。参考项目的 catalog 没给列车 rotation，这是一处刻意的分歧。
  train: { url: "/models/train.glb", forward: [0, 0, -1], up: [0, 1, 0], preserveMaterials: true },
  // 旅行游艇：长轴在 X（3.35）、船头 +X —— 分件阈值就是按这个原始朝向量的，不能先转再量。
  ferry: { url: "/models/boat.glb", forward: [1, 0, 0], up: [0, 1, 0], paint: "sailboat", paintColor: "#efe6d1" },
};

/** 归一化后的最长轴。取景是逐实例自适应的，这个值只用来把各种量级（游艇 3.3、飞机 2498）收进同一档。 */
const BODY_SPAN = 4.2;

/** 把模型转到场景约定：前 = +X，左 = +Y，上 = +Z。Z-up 才能和地图俯视对齐。 */
function orientationMatrix(asset: VehicleAsset) {
  const forward = new THREE.Vector3(...asset.forward).normalize();
  const up = new THREE.Vector3(...asset.up).normalize();
  const left = new THREE.Vector3().crossVectors(up, forward).normalize();
  // makeBasis 给出的是「场景轴 → 模型轴」，要的是它的逆。正交矩阵的逆就是转置，
  // 所以这里不用 invert()，也就不会引入数值误差或意外的镜像。
  return new THREE.Matrix4().makeBasis(forward, left, up).transpose();
}

/**
 * 处理好的模型按载具缓存。smooth → paint → curve 三步是纯 CPU 计算（跑车 11,999 面细分成
 * 四万多面），同屏可能有五个实例，各算一遍纯属浪费；缓存下来 clone 出去，几何和材质共享。
 * 因此实例卸载时**不能** dispose 里面的几何和材质 —— 那是缓存的东西，还有别的实例在用。
 */
const prepared = new Map<VehicleKind, Promise<THREE.Object3D>>();

let sharedLoader: GLTFLoader | null = null;
function vehicleLoader() {
  if (!sharedLoader) {
    const draco = new DRACOLoader().setDecoderPath("/draco/").setWorkerLimit(1);
    sharedLoader = new GLTFLoader().setDRACOLoader(draco);
  }
  return sharedLoader;
}

export function preloadVehicle(kind: VehicleKind) {
  const cached = prepared.get(kind);
  if (cached) return cached;
  const asset = ASSETS[kind];
  const task = new Promise<THREE.Object3D>((resolve, reject) => {
    vehicleLoader().load(
      asset.url,
      (gltf) => {
        try {
          // Preserve the exact existing geometry/material pipeline.
          smoothModel(gltf.scene, (asset.crease ?? 65) * Math.PI / 180);
          if (asset.paint) paintModel(gltf.scene, { paint: asset.paint, paintColor: asset.paintColor ?? "#c9ced6" });
          else if (asset.preserveMaterials) flattenMaterials(gltf.scene);
          curveModel(gltf.scene);
          resolve(gltf.scene);
        } catch (error) {
          prepared.delete(kind);
          reject(error);
        }
      },
      undefined,
      (error) => {
        // 失败的 promise 别留在缓存里，否则重挂的实例只会拿到同一个已拒绝的结果。
        prepared.delete(kind);
        reject(error);
      },
    );
  });
  prepared.set(kind, task);
  return task;
}

type Motion = {
  /** 悬空高度，单位是车身高。飞机在天上，轮船略微吃水。 */
  hover: number;
  /** [幅度, 频率Hz]。rise 沿 +Z，roll 绕前进轴 X，pitch 绕横轴 Y。rise 幅度是车身高的倍数。 */
  rise: [number, number];
  roll: [number, number];
  pitch: [number, number];
  /** 转向侧倾系数：飞机压坡度进弯，火车在轨道上不倾。 */
  bank: number;
  /**
   * 航向跟随的指数速率（1/秒），越大越贴合真实航向、也越容易把航向信号里的台阶照抄成抖动。
   * 四种都在 2026-08-14 这一轮整体降过一档（飞机 9→7、汽车 14→9、火车 22→13、轮船 5→4.5）：
   * 弯中的稳态侧倾角只由路线曲率决定，和这个系数无关，所以降它只吃掉瞬态的那一「弹」，
   * 该有的过弯侧倾一度都不少（实测四种候选的侧倾峰值都是 14.9°）。
   * 汽车这一档有实拍复核：同一段公路上偏航角速度峰值减半、角加速度 RMS 也减半，
   * 数字和量法都记在 page.tsx 的 HEADING_SMOOTH 注释里 —— 那两个系数是一条链上的前后两级，得一起看。
   */
  turn: number;
  /** 车轮角速度（弧度/秒），0 表示这个模型没有可转的轮子。 */
  wheel: number;
  /** 自身**姿态**动作跟随播放倍速的比例。风浪不会因为播得快就变急。轮子不走这条，见 render 里的 spin。 */
  follow: number;
  /** 地面投影：[不透明度基准, 呼吸幅度, 相对车身的大小]。 */
  shadow: [number, number, number];
};

/** 四种载具的运动性格。这张表是「不同载具运动方式不一样」的唯一来源。 */
const MOTION: Record<VehicleKind, Motion> = {
  // 飞机：离地巡航，长周期起伏，转弯靠压坡度，投影小而淡（离地面远）。
  flight: { hover: .75, rise: [.10, .21], roll: [.05, .13], pitch: [.03, .17], bank: 6, turn: 7, wheel: 0, follow: .3, shadow: [.07, .02, .6] },
  // 汽车：贴地，悬挂在 1Hz 出头的低频上起伏，四个轮子跟着转，转向最灵活。
  // 频率原来是 2.4 / 1.7 / 3.1Hz 且 follow 为 1 —— 三条快频叠在一起再整倍跟倍速，
  // 地球仪视角下 pitch 就落到 3~5Hz，读出来是「在抖」，不是「在过坎」。
  car: { hover: 0, rise: [0, 1], roll: [0, 1], pitch: [0, 1], bank: 0, turn: 9, wheel: 9, follow: .45, shadow: [.2, 0, 1] },
  // 火车：受轨道约束，几乎不起伏也不侧倾，只有极轻的低频晃动。
  train: { hover: .015, rise: [.006, 1.1], roll: [.01, .55], pitch: [.004, .8], bank: 0, turn: 13, wheel: 0, follow: 1, shadow: [.18, .01, 1] },
  // 轮船：随浪，长周期大幅纵摇加横摇，转向最慢，投影当作水线光晕。
  ferry: { hover: -.05, rise: [.05, .33], roll: [.075, .25], pitch: [.07, .4], bank: 2.5, turn: 4.5, wheel: 0, follow: .25, shadow: [.14, .03, 1.05] },
};

/** 坡度上限。既保证读得出转向，又让相机的取景余量可以有限、不必留一大圈空白。 */
const BANK_LIMIT = .26;

const WORLD_UP = new THREE.Vector3(0, 0, 1);

/**
 * 机位：方位角自 +X 起逆时针，仰角自水平面起，rest 是没有航向时的静态朝向。
 * yawFree 表示这个机位下航向会一直变，取景必须与偏航无关。
 */
const VIEWS: Record<VehicleView, { azimuth: number; elevation: number; rest: number; yawFree: boolean }> = {
  // 相机正在载具的 -Y 侧，于是屏幕上方 = 场景 +Y，heading 就是屏幕上的方位角本身。
  map: { azimuth: -90, elevation: 50, rest: 0, yawFree: true },
  // 面板里的 3/4 侧视：rest 取 118° 让载具接近正横，长度不被投影压掉 —— 仰角 24° 时
  // 正对镜头的载具屏幕长度只剩 sin(24°)=41%，取景又得按全长留白，看着就小一圈。
  hero: { azimuth: -52, elevation: 24, rest: 118, yawFree: false },
};

/**
 * 屏幕方位角 → 场景偏航角。相机在方位角 A 上时屏幕上方对应场景方位角 A+180，
 * 且屏幕顺时针 = 场景方位角递减，所以 yaw = A + 180 - heading。
 */
const yawFor = (view: VehicleView, headingDeg: number) =>
  THREE.MathUtils.degToRad(VIEWS[view].azimuth + 180 - headingDeg);

function shortestTurn(from: number, to: number) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/** 径向渐变贴图。纯色圆片看着像贴纸，一张 64px 的软边贴图就够把它变成投影。 */
function makeShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(7,16,29,1)");
  gradient.addColorStop(.5, "rgba(7,16,29,.66)");
  gradient.addColorStop(1, "rgba(7,16,29,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 环境反射。GLB 里有好几处 metalness=1 的材质 —— ferry 的船体 `Black`（metal 1.00 / rough 0.15）、
 * 甲板水面 `agua`，plane 的引擎金属和 `glass`。PBR 金属的漫反射为零，颜色**全部**来自环境反射，
 * 场景没有 environment 时它们只能算出纯黑：整条 ferry 就是这样丢掉体积、变成一片黑剪影的。
 * 这里用一张 canvas 天顶到地面的渐变过 PMREM，不引入任何外部资源，也和面板的浅色底一致。
 */
function makeEnvironment(renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  // 只需要竖向渐变，横向 4px 足够；PMREM 会把它糊成各粗糙度的 mip。
  canvas.width = 4;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(.46, "#dce7f4");
  gradient.addColorStop(.52, "#93a7bd");
  gradient.addColorStop(1, "#4a5765");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 64);
  const source = new THREE.CanvasTexture(canvas);
  source.mapping = THREE.EquirectangularReflectionMapping;
  source.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(source);
  pmrem.dispose();
  source.dispose();
  return target;
}

export default function Vehicle3D({ kind, progress = 0, className = "", heading, rate = 1, view = "hero", onReady, retryToken = 0 }: Vehicle3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const headingRef = useRef(heading);
  const rateRef = useRef(rate);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    // An explicit re-selection may retry a failed load without remounting healthy models.
    if (stateRef.current === "error") setRetry(value => value + 1);
  }, [retryToken]);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { headingRef.current = heading; }, [heading]);
  useEffect(() => { rateRef.current = rate; }, [rate]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const asset = ASSETS[kind];
    const motion = MOTION[kind];
    const shot = VIEWS[view];
    const azimuth = THREE.MathUtils.degToRad(shot.azimuth);
    const elevation = THREE.MathUtils.degToRad(shot.elevation);
    let disposed = false;
    let frame = 0;
    let modelReady = false;
    let readyPublished = false;
    setState("loading");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    // 不开 shadowMap：唯一的「地面」是下面那张贴图片，MeshBasicMaterial 收不到阴影，
    // 开了只是白白多跑一遍深度渲染 —— 同屏最多五个实例，省下来的是实打实的。
    mount.appendChild(renderer.domElement);

    // scene → yaw(航向) → presentation(起伏/侧倾/俯仰) → model
    // 投影挂在 yaw 上而不是 presentation 上：它要跟着转向，但不该跟着车身一起颠。
    const yaw = new THREE.Group();
    const presentation = new THREE.Group();
    yaw.add(presentation);
    scene.add(yaw);

    // environment 顶掉了原先靠环境光硬撑的那部分，所以半球光要跟着降下来，否则整体发白。
    const environment = makeEnvironment(renderer);
    scene.environment = environment?.texture ?? null;
    scene.environmentIntensity = 1.15;
    scene.add(new THREE.HemisphereLight(0xf8fbff, 0x486078, environment ? 1.15 : 2.45));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(3, -5, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(kind === "car" ? 0xff9caf : 0x82c7ff, 2.3);
    rim.position.set(-5, 4, 2);
    scene.add(rim);

    const shadowTexture = makeShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTexture ?? undefined,
      color: shadowTexture ? 0xffffff : 0x07101d,
      transparent: true,
      opacity: motion.shadow[0],
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
    shadow.visible = false;
    yaw.add(shadow);

    // 相机基。方位角和仰角是常量，所以这三个向量一次算完复用：
    // dir 是取景中心指向相机，right/upCam 与 camera.up=(0,0,1) 下 three 的 lookAt 结果一致。
    const dir = new THREE.Vector3(
      Math.cos(elevation) * Math.cos(azimuth),
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
    );
    const right = new THREE.Vector3().crossVectors(WORLD_UP, dir).normalize();
    const upCam = new THREE.Vector3().crossVectors(dir, right);

    // 装配完模型才知道取景数据，先放占位值：resize 和加载完成各自会重算机位。
    // fitProjected 是取景点集在相机基下的 (沿视轴, |横向|, |竖向|) 三元组，只有固定姿态的机位才需要。
    let fitProjected: Float32Array | null = null;
    let fitRadius = 2.6;
    let focusZ = 0;
    const placeCamera = () => {
      // 留一点边距，免得抗锯齿边缘正好贴着画布边；再乘上这个载具自己的取景余量。
      const margin = 1.06 * (asset.frame ?? 1);
      const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
      const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
      let distance: number;
      if (!fitProjected) {
        // 航向一直在变（地图上的载具）：用内切于视锥的包围球定距。球心落在视轴上，
        // d·sin(半角) ≥ R 就一定裁不到；半径绕竖轴旋转不变，所以转满 360° 也不会有哪个朝向被切掉。
        distance = fitRadius * margin / Math.sin(Math.min(halfV, halfH));
      } else {
        // 姿态固定（面板里的 hero）：直接解「每个点都落在视锥内」的最小距离。
        // 点 p 到位于 d 处的相机的深度是 d - p·dir，横向偏移要满足
        // |p·right| ≤ tan(halfH)·(d - p·dir)，竖向同理 —— 逐点取上界即可。
        const tanH = Math.tan(halfH) / margin;
        const tanV = Math.tan(halfV) / margin;
        distance = 0;
        for (let index = 0; index < fitProjected.length; index += 3) {
          const along = fitProjected[index];
          const h = along + fitProjected[index + 1] / tanH;
          const v = along + fitProjected[index + 2] / tanV;
          if (h > distance) distance = h;
          if (v > distance) distance = v;
        }
      }
      camera.position.set(dir.x * distance, dir.y * distance, focusZ + dir.z * distance);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, focusZ);
      camera.near = Math.max(.05, distance - fitRadius * 1.1);
      camera.far = distance + fitRadius * 1.1;
      camera.updateProjectionMatrix();
    };

    let bodyHeight = 1;
    let groundZ = 0;
    const wheels: THREE.Object3D[] = [];

    preloadVehicle(kind)
      .then((source) => {
        if (disposed) return;
        // 缓存里那份是共享的，实例拿克隆体；几何和材质仍按引用共用，只有变换是各自的。
        const model = source.clone(true);
        model.applyMatrix4(orientationMatrix(asset));
        model.updateMatrixWorld(true);
        const raw = new THREE.Box3().setFromObject(model);
        // 几何中心对齐到 body 原点：侧倾俯仰绕车身中心转，而不是绕偏心点甩。
        model.position.sub(raw.getCenter(new THREE.Vector3()));
        const extent = raw.getSize(new THREE.Vector3());
        // 归一化和 widen 一起挂在外层：uniform 缩放和非等比的 widen 可交换，
        // 而 widen 必须在朝向修正**之后**才谈得上「宽度」—— 模型自己的 X 不一定是车宽方向。
        const unit = BODY_SPAN / (Math.max(extent.x, extent.y, extent.z) || 1);
        const body = new THREE.Group();
        body.scale.set(unit, unit * (asset.widen ?? 1), unit);
        body.add(model);
        // 重算一次世界矩阵，下面抽顶点要用。此刻 body 还没挂进场景，
        // 所以 mesh.matrixWorld 就是相对 body 根节点的变换，正好是 presentation 空间。
        body.updateMatrixWorld(true);
        model.traverse((object) => {
          if (/^wheel/i.test(object.name)) wheels.push(object);
        });
        const size = extent.multiply(body.scale);

        bodyHeight = size.z || 1;
        groundZ = -bodyHeight * (.5 + motion.hover);
        const shadowX = size.x * .5 * motion.shadow[2];
        const shadowY = size.y * .8 * motion.shadow[2];
        shadow.scale.set(shadowX * 2, shadowY * 2, 1);
        shadow.position.z = groundZ;
        // 这张椭圆投影只属于展示卡片。叠到透明的地图载具画布上会像一块灰白反光。
        shadow.visible = view !== "map";

        // 取景点集取真实顶点，不取包围盒八角：飞机的平面投影是 4.20×3.86 的十字，
        // 按包围盒算会把四个空角也算进取景，机身在框里就只剩一半大。按步长抽样，上限 2400 点。
        const meshes: THREE.Mesh[] = [];
        let vertexCount = 0;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            meshes.push(object);
            vertexCount += object.geometry.attributes.position.count;
          }
        });
        const stride = Math.max(1, Math.ceil(vertexCount / 2400));
        const cloud: THREE.Vector3[] = [];
        const vertex = new THREE.Vector3();
        for (const mesh of meshes) {
          const position = mesh.geometry.attributes.position;
          for (let index = 0; index < position.count; index += stride) {
            vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
            cloud.push(vertex.clone());
          }
        }
        // 动作余量逐点算，而不是先套一个包围盒再拍系数：侧倾把这个点自己的 |y| 抬进竖向、
        // 俯仰把 |x| 抬进竖向，同时 |z| 也会外扩到横向；起伏再整体上下平移。
        // 逐点做才不会把十字形重新胀回一个方盒。
        const rollMax = Math.sin(motion.roll[0] + (motion.bank > 0 ? BANK_LIMIT : 0));
        const pitchMax = Math.sin(motion.pitch[0]);
        const rise = motion.rise[0] * bodyHeight;
        const swollen: THREE.Vector3[] = [];
        let topZ = -Infinity;
        let bottomZ = Infinity;
        for (const point of cloud) {
          const spread = Math.abs(point.y) * rollMax + Math.abs(point.x) * pitchMax + rise;
          const x = point.x + Math.sign(point.x) * Math.abs(point.z) * pitchMax;
          const y = point.y + Math.sign(point.y) * Math.abs(point.z) * rollMax;
          swollen.push(new THREE.Vector3(x, y, point.z + spread), new THREE.Vector3(x, y, point.z - spread));
          topZ = Math.max(topZ, point.z + spread);
          bottomZ = Math.min(bottomZ, point.z - spread);
        }
        // 投影贴图取四个轴端而不是四角：径向渐变到内切圆就已经透明，角上是看不见的。
        // 它挂在 yaw 下、不在 presentation 下，所以既不侧倾也不起伏 —— 不能套上面那份动作余量，
        // 否则飞机那种离地远的投影会被算大一圈，白白把机身挤小。
        if (view !== "map") {
          bottomZ = Math.min(bottomZ, groundZ);
          for (const point of [[shadowX, 0], [-shadowX, 0], [0, shadowY], [0, -shadowY]] as const) {
            swollen.push(new THREE.Vector3(point[0], point[1], groundZ));
          }
        }
        focusZ = (topZ + bottomZ) / 2;

        fitRadius = 0;
        for (const point of swollen) {
          point.z -= focusZ;
          fitRadius = Math.max(fitRadius, point.length());
        }
        if (shot.yawFree) {
          // 偏航自由时只用得到包围球半径，绕竖轴旋转不改变长度，所以连姿态都不用套。
          fitProjected = null;
        } else {
          const rest = new THREE.Matrix4().makeRotationZ(yawFor(view, shot.rest));
          fitProjected = new Float32Array(swollen.length * 3);
          for (let index = 0; index < swollen.length; index += 1) {
            const point = swollen[index].applyMatrix4(rest);
            fitProjected[index * 3] = point.dot(dir);
            fitProjected[index * 3 + 1] = Math.abs(point.dot(right));
            fitProjected[index * 3 + 2] = Math.abs(point.dot(upCam));
          }
        }
        placeCamera();
        presentation.add(body);
        modelReady = true;
      })
      .catch(() => { if (!disposed) setState("error"); });

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      placeCamera();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const start = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = 0;
    const nativeFrameInterval = document.documentElement.hasAttribute("data-native-shell") ? 1000 / 60 : 0;
    let renderedAt = -Infinity;
    let yawAngle: number | null = null;
    let bankRate = 0;
    yaw.rotation.z = yawFor(view, shot.rest);

    const render = (now: number) => {
      if (document.hidden || now - renderedAt < nativeFrameInterval - .5) {
        frame = requestAnimationFrame(render);
        return;
      }
      renderedAt = now;
      if (!modelReady) {
        frame = requestAnimationFrame(render);
        return;
      }
      const elapsed = (now - start) / 1000;
      // 切走标签页再回来时 now 会跳一大截，截断避免动作瞬移。
      const delta = previous ? Math.min(.05, (now - previous) / 1000) : 0;
      previous = now;
      const playRate = Math.max(.05, rateRef.current ?? 1);
      // 每种载具按自己的跟随系数把倍速折进**姿态**频率：风浪基本不跟。
      // 再夹一个上限：滑块 2× 撞上缩放折算 2.5× 时 playRate 能到 5，不夹的话车身会糊成高频抖动。
      const beat = Math.min(2.4, 1 + (playRate - 1) * motion.follow);

      if (headingRef.current !== undefined) {
        const target = yawFor(view, headingRef.current);
        if (yawAngle === null) {
          yawAngle = target;
        } else {
          // 指数收敛用 delta 算，不用固定的每帧比例 —— 否则帧率一变跟随快慢就变。
          const turn = shortestTurn(yawAngle, target) * (1 - Math.exp(-delta * motion.turn));
          yawAngle += turn;
          if (delta > 0) bankRate += (turn / delta - bankRate) * (1 - Math.exp(-delta * 4));
        }
        yaw.rotation.z = yawAngle;
      }

      // 「载具」页（hero 机位）是静态展台：不起伏、不侧倾、不转轮。reduceMotion 同样全停。
      // 地图上的 rider 走 view="map"，继续按 MOTION 的动作性格动。
      if (reduceMotion.matches || view === "hero" || (view === "map" && kind === "flight") || kind === "car") {
        presentation.position.z = 0;
        presentation.rotation.set(0, 0, 0);
        if (!reduceMotion.matches && view === "map" && kind === "car" && motion.wheel) {
          const spin = motion.wheel * playRate * delta;
          for (const wheel of wheels) wheel.rotation.x += spin;
        }
      } else {
        // progress 只当相位种子：同一种载具在不同航段的姿态不会撞在同一帧上。
        const phase = elapsed * beat + progressRef.current * .05;
        const stageMotion = vehicleStageMotion(kind, progressRef.current);
        presentation.position.z = (Math.sin(phase * motion.rise[1] * Math.PI * 2) * motion.rise[0] + stageMotion.lift) * bodyHeight;
        const bank = THREE.MathUtils.clamp(bankRate * motion.bank, -BANK_LIMIT, BANK_LIMIT);
        presentation.rotation.x = Math.sin(phase * motion.roll[1] * Math.PI * 2) * motion.roll[0] - bank;
        presentation.rotation.y = Math.sin(phase * motion.pitch[1] * Math.PI * 2 + 1.1) * motion.pitch[0] + stageMotion.pitch;
        shadowMaterial.opacity = motion.shadow[0] + Math.sin(phase * motion.rise[1] * Math.PI * 2) * motion.shadow[1];
        if (motion.wheel) {
          // 轮子节点的本地 +X 就是轮轴，几何又正好以节点原点为心，所以绕 x 转即原地滚。
          // 转速用 playRate 本身，既不折 follow 也不夹上限：车身可以「不那么跟」倍速，
          // 轮子跟不上就是在打滑。四种载具里只有汽车有轮子，这条不影响别的。
          const spin = motion.wheel * playRate * stageMotion.velocity * delta;
          for (const wheel of wheels) wheel.rotation.x += spin;
        }
      }
      renderer.render(scene, camera);
      if (!readyPublished) {
        readyPublished = true;
        setState("ready");
        onReadyRef.current?.(kind);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      // 模型的几何和材质来自 prepared 缓存、多个实例共用，这里只能扔掉本实例自建的东西。
      shadow.geometry.dispose();
      shadowTexture?.dispose();
      shadowMaterial.dispose();
      environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [kind, view, retry]);

  return (
    <div ref={mountRef} className={`vehicle-3d ${className} is-${state}`} aria-label={`${LABELS[kind]} 3D 模型`}>
      {state === "loading" && <span className="vehicle-load-state" aria-hidden="true" />}
      {state === "error" && <span className="vehicle-load-error">模型加载失败</span>}
    </div>
  );
}
