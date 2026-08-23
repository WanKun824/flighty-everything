import type { VehicleKind } from "./Vehicle3D";

/** 交通方式。沿用 Vehicle3D 的载具种类，行程每站 type 表示「从这里出发怎么走」。 */
export type Transport = VehicleKind;

export type TripStop = {
  id: string;
  city: string;
  detail: string;
  time: string;
  type: Transport;
  color: string;
  coordinate: [number, number];
  code?: string;
  kind: "airport" | "station" | "port" | "place";
  photo: string;
  /** ISO 3166-1 两位小写国家码。标记点默认显示这面国旗，取不到就退回序号。 */
  country?: string;
};

/** 示例行程。真实坐标，首站香港、经东京/京都/宇野，终到直岛。 */
export const initialTripStops: TripStop[] = [
  { id: "hkg", city: "香港", detail: "香港国际机场 · T1", code: "HKG", time: "9月18日 · 08:45", type: "flight", color: "#0a84ff", coordinate: [113.9185, 22.3080], kind: "airport", country: "hk", photo: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=500&q=84" },
  { id: "hnd", city: "东京", detail: "羽田机场 · T3", code: "HND", time: "9月18日 · 14:00", type: "car", color: "#ff375f", coordinate: [139.7798, 35.5494], kind: "airport", country: "jp", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=500&q=84" },
  { id: "tokyo", city: "东京", detail: "东京站 · 丸之内口", code: "TYO", time: "9月20日 · 09:10", type: "train", color: "#bf5af2", coordinate: [139.7671, 35.6812], kind: "station", country: "jp", photo: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=500&q=84" },
  { id: "kyoto", city: "京都", detail: "京都站 · 八条口", code: "KYO", time: "9月20日 · 11:22", type: "train", color: "#ff9f0a", coordinate: [135.7588, 34.9858], kind: "station", country: "jp", photo: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=84" },
  { id: "uno", city: "宇野", detail: "宇野港 · 1号码头", code: "UNO", time: "9月23日 · 10:40", type: "ferry", color: "#32ade6", coordinate: [133.9538, 34.4910], kind: "port", country: "jp", photo: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=500&q=84" },
  { id: "naoshima", city: "直岛", detail: "宫浦港 · 艺术岛入口", code: "NAO", time: "9月23日 · 11:00", type: "ferry", color: "#30d158", coordinate: [133.9720, 34.4563], kind: "port", country: "jp", photo: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=500&q=84" },
];
