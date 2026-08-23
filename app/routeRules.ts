export type RouteTransport = "flight" | "car" | "train" | "ferry";

export type RouteRule = {
  label: string;
  engine: "mapbox-directions" | "geodesic-corridor";
  profile?: "driving";
  geometry: "road" | "airway" | "rail-corridor" | "water-corridor";
  model: string;
  note: string;
};

export const ROUTE_RULES: Record<RouteTransport, RouteRule> = {
  flight: {
    label: "飞机",
    engine: "geodesic-corridor",
    geometry: "airway",
    model: "/models/legacy-plane.glb",
    note: "机场到机场使用大圆航路；后续可叠加真实航路点数据。",
  },
  car: {
    label: "汽车",
    engine: "mapbox-directions",
    profile: "driving",
    geometry: "road",
    model: "/models/porsche.glb",
    note: "优先使用 Mapbox driving 公路几何，失败时回退到大圆连线。",
  },
  train: {
    label: "火车",
    engine: "geodesic-corridor",
    geometry: "rail-corridor",
    model: "/models/train.glb",
    note: "车站到车站使用铁路走廊规则；Mapbox Directions 不提供铁路 profile。",
  },
  ferry: {
    label: "轮船",
    engine: "geodesic-corridor",
    geometry: "water-corridor",
    model: "/models/boat.glb",
    note: "港口到港口使用水路走廊规则；后续可接入航道数据。",
  },
};

export function routeRuleFor(mode: RouteTransport): RouteRule {
  return ROUTE_RULES[mode];
}
