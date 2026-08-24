import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bearingDeg, buildTimeline, geodesic, haversineKm, locate, measure, pointAt, unwrap,
} from "../app/routeGeometry.ts";

// 真实坐标，跟 initialTripStops 一致
const HKG = [113.9185, 22.3080];
const HND = [139.7798, 35.5494];
const TYO = [139.7671, 35.6812];
const KYO = [135.7588, 34.9858];

test("球面距离对得上公开的真实航段里程", () => {
  // 香港 → 羽田公开大圆距离约 2,890 km（航空数据源普遍给 2,880–2,900）
  const km = haversineKm(HKG, HND);
  assert.ok(km > 2840 && km < 2940, `HKG→HND 得到 ${km.toFixed(0)} km，超出 2840–2940 区间`);
  // 东京站 → 京都站直线约 366 km（东海道新干线营业里程 513.6 km，直线短于它才合理）
  const rail = haversineKm(TYO, KYO);
  assert.ok(rail > 350 && rail < 380, `TYO→KYO 得到 ${rail.toFixed(0)} km`);
  assert.ok(rail < 513.6, "直线距离必须小于新干线营业里程");
});

test("大圆不是经纬度直线：中点必须偏离线性中点", () => {
  const path = geodesic(HKG, HND, 64);
  assert.equal(path.length, 65);
  assert.deepEqual(path[0].map(Math.round), HKG.map(Math.round));
  const mid = path[32];
  const linearMid = [(HKG[0] + HND[0]) / 2, (HKG[1] + HND[1]) / 2];
  const offset = haversineKm(mid, linearMid);
  // 这个偏移正是旧代码「经纬度线性插值」丢掉的真实弧度
  assert.ok(offset > 20, `大圆中点只偏离线性中点 ${offset.toFixed(1)} km，slerp 可能没生效`);
  // 北半球东行的大圆应当向北凸
  assert.ok(mid[1] > linearMid[1], "北半球大圆中点纬度应高于线性中点");
});

test("大圆每一步长度均匀，载具才不会忽快忽慢", () => {
  const path = geodesic(HKG, HND, 48);
  const steps = path.slice(1).map((point, index) => haversineKm(path[index], point));
  const min = Math.min(...steps);
  const max = Math.max(...steps);
  assert.ok(max / min < 1.02, `步长最大/最小 = ${(max / min).toFixed(3)}，应接近 1`);
});

test("退化输入不产生 NaN", () => {
  const same = geodesic(TYO, TYO, 32);
  assert.equal(same.length, 2);
  const leg = measure("car", same, "geodesic");
  assert.equal(leg.km, 0);
  const at = pointAt(leg, 0.5);
  assert.ok(Number.isFinite(at.coordinate[0]) && Number.isFinite(at.coordinate[1]), "零长度段返回了 NaN");
  assert.ok(Number.isFinite(at.bearing));
});

test("方位角符合正北顺时针约定", () => {
  assert.ok(Math.abs(bearingDeg([0, 0], [0, 10]) - 0) < 0.001, "正北应为 0°");
  assert.ok(Math.abs(bearingDeg([0, 0], [10, 0]) - 90) < 0.001, "正东应为 90°");
  assert.ok(Math.abs(bearingDeg([0, 0], [0, -10]) - 180) < 0.001, "正南应为 180°");
  assert.ok(Math.abs(bearingDeg([0, 0], [-10, 0]) - 270) < 0.001, "正西应为 270°");
  // 香港飞东京是东北向
  const heading = bearingDeg(HKG, HND);
  assert.ok(heading > 30 && heading < 75, `HKG→HND 航向 ${heading.toFixed(1)}°，应在东北象限`);
});

test("弧长参数化：进度均匀推进时位移也均匀，哪怕顶点疏密不均", () => {
  // 故意造一条前密后疏的折线，模拟真实路网
  const ragged = [[135, 35], [135.01, 35], [135.02, 35], [135.03, 35], [136, 35], [137, 35]];
  const leg = measure("train", ragged, "road");
  const samples = Array.from({ length: 11 }, (_, index) => pointAt(leg, index / 10).coordinate);
  const hops = samples.slice(1).map((point, index) => haversineKm(samples[index], point));
  const min = Math.min(...hops);
  const max = Math.max(...hops);
  assert.ok(max / min < 1.05, `按索引插值会让这里严重不均；实测最大/最小 = ${(max / min).toFixed(3)}`);
  assert.ok(Math.abs(pointAt(leg, 0).coordinate[0] - 135) < 1e-9, "t=0 必须落在起点");
  assert.ok(Math.abs(pointAt(leg, 1).coordinate[0] - 137) < 1e-9, "t=1 必须落在终点");
});

test("跨 ±180 经线的线被展开，不会横穿整张地图", () => {
  const crossing = unwrap([[179, 20], [-179, 21], [-177, 22]]);
  assert.ok(crossing[1][0] > 180, `第二点应展开到 181 附近，实际 ${crossing[1][0]}`);
  const jumps = crossing.slice(1).map((point, index) => Math.abs(point[0] - crossing[index][0]));
  assert.ok(Math.max(...jumps) < 180, "展开后不应再有超过 180° 的经度跳变");
});

test("时间轴按巡航速度加权，且被压缩到可观看的比例", () => {
  const paths = [
    measure("flight", geodesic(HKG, HND), "geodesic"),
    measure("car", geodesic(HND, TYO), "road"),
    measure("train", geodesic(TYO, KYO), "road"),
  ];
  const timeline = buildTimeline(paths);
  assert.equal(timeline.legs.length, 3);
  assert.equal(timeline.legs[0].from, 0);
  assert.equal(timeline.legs[2].to, 1, "最后一段必须精确收在 1，否则进度尾部会有死区");
  for (let index = 1; index < timeline.legs.length; index += 1) {
    assert.equal(timeline.legs[index].from, timeline.legs[index - 1].to, "段之间不能有缝");
  }
  const share = timeline.legs.map((leg) => leg.to - leg.from);
  // 航段里程是汽车段的一百多倍，压缩后占比不该超过它的 10 倍，否则短段看不见
  assert.ok(share[0] / share[1] < 10, `航段/汽车段时长比 ${(share[0] / share[1]).toFixed(1)}，压缩失效`);
  // 但顺序必须保住：飞得最远的一段仍然占最久
  assert.ok(share[0] === Math.max(...share), "最长的一段应占最多时间");
  assert.ok(timeline.hours > 4 && timeline.hours < 8, `全程巡航 ${timeline.hours.toFixed(1)} 小时，不合理`);
});

test("locate 覆盖全区间且不越界", () => {
  const paths = [
    measure("flight", geodesic(HKG, HND), "geodesic"),
    measure("train", geodesic(TYO, KYO), "road"),
  ];
  const timeline = buildTimeline(paths);
  for (const t of [-1, 0, 0.25, 0.5, 0.999, 1, 2]) {
    const { legIndex, legProgress } = locate(timeline, t);
    assert.ok(legIndex >= 0 && legIndex < paths.length, `t=${t} 落到了第 ${legIndex} 段`);
    assert.ok(legProgress >= 0 && legProgress <= 1, `t=${t} 段内进度 ${legProgress}`);
  }
  assert.equal(locate(timeline, 0).legIndex, 0);
  assert.equal(locate(timeline, 1).legIndex, paths.length - 1, "t=1 应停在最后一段而不是越界");
});

test("真实路网线形比大圆长，但不会长得离谱", () => {
  // 用一条带绕行的折线冒充路网结果，验证 measure 的里程是沿线累加而非端到端
  const road = [TYO, [139.5, 35.4], [138.5, 35.2], [137.2, 35.1], KYO];
  const roadLeg = measure("train", road, "road");
  const direct = measure("train", geodesic(TYO, KYO), "geodesic");
  assert.ok(roadLeg.km > direct.km, "沿线累加里程必须大于大圆里程");
  assert.ok(roadLeg.km < direct.km * 3.2, "超过大圆 3.2 倍的结果应该在 roadPath 里就被拒掉");
  assert.equal(roadLeg.source, "road");
  assert.equal(roadLeg.cumulativeKm.length, road.length);
  assert.equal(roadLeg.cumulativeKm[0], 0);
});
