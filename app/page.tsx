"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { createPortal } from "react-dom";
import SFHouse from "sf-symbols-lib/monochrome/SFHouse";
import SFHouseFill from "sf-symbols-lib/monochrome/SFHouseFill";
import SFMap from "sf-symbols-lib/monochrome/SFMap";
import SFMapFill from "sf-symbols-lib/monochrome/SFMapFill";
import SFBubbleLeftAndBubbleRight from "sf-symbols-lib/monochrome/SFBubbleLeftAndBubbleRight";
import SFBubbleLeftAndBubbleRightFill from "sf-symbols-lib/monochrome/SFBubbleLeftAndBubbleRightFill";
import SFPersonCropCircle from "sf-symbols-lib/monochrome/SFPersonCropCircle";
import SFPersonCropCircleFill from "sf-symbols-lib/monochrome/SFPersonCropCircleFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFMagnifyingglass from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import SFBell from "sf-symbols-lib/monochrome/SFBell";
import SFSquareAndArrowUp from "sf-symbols-lib/monochrome/SFSquareAndArrowUp";
import SFHeart from "sf-symbols-lib/monochrome/SFHeart";
import SFHeartFill from "sf-symbols-lib/monochrome/SFHeartFill";
import SFMessage from "sf-symbols-lib/monochrome/SFMessage";
import SFBookmark from "sf-symbols-lib/monochrome/SFBookmark";
import SFBookmarkFill from "sf-symbols-lib/monochrome/SFBookmarkFill";
import SFEllipsis from "sf-symbols-lib/monochrome/SFEllipsis";
import SFLocationFill from "sf-symbols-lib/monochrome/SFLocationFill";
import SFLocationNorthFill from "sf-symbols-lib/monochrome/SFLocationNorthFill";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFFerryFill from "sf-symbols-lib/monochrome/SFFerryFill";
import SFTrainSideFrontCar from "sf-symbols-lib/monochrome/SFTrainSideFrontCar";
import SFPaperplaneFill from "sf-symbols-lib/monochrome/SFPaperplaneFill";
import SFCameraFill from "sf-symbols-lib/monochrome/SFCameraFill";
import SFMicrophoneFill from "sf-symbols-lib/monochrome/SFMicrophoneFill";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFChevronLeft from "sf-symbols-lib/monochrome/SFChevronLeft";
import SFGearshapeFill from "sf-symbols-lib/monochrome/SFGearshapeFill";
import SFPhotoFill from "sf-symbols-lib/monochrome/SFPhotoFill";
import SFPlayFill from "sf-symbols-lib/monochrome/SFPlayFill";
import SFPauseFill from "sf-symbols-lib/monochrome/SFPauseFill";
import SFCheckmarkCircleFill from "sf-symbols-lib/monochrome/SFCheckmarkCircleFill";
import SFClock from "sf-symbols-lib/monochrome/SFClock";
import SFRectangleGrid2x2Fill from "sf-symbols-lib/monochrome/SFRectangleGrid2x2Fill";
import SFEnvelopeFill from "sf-symbols-lib/monochrome/SFEnvelopeFill";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import SFLockFill from "sf-symbols-lib/monochrome/SFLockFill";
import SFHandRaisedFill from "sf-symbols-lib/monochrome/SFHandRaisedFill";
import SFInfoCircleFill from "sf-symbols-lib/monochrome/SFInfoCircleFill";
import SFChartBarFill from "sf-symbols-lib/monochrome/SFChartBarFill";
import SFCloudSunFill from "sf-symbols-lib/monochrome/SFCloudSunFill";
import SFCarFill from "sf-symbols-lib/monochrome/SFCarFill";
import { animalAvatars } from "./animalAvatars";
import JourneyPanel from "./JourneyPanel";
import { usePlatformMode, type AppPlatform, type PlatformPreference } from "./platform";
import { routeRuleFor } from "./routeRules";
import { liveJourneyStatus, parseJourneyWindow, timelineProgressAt, type JourneyClockMode } from "./timeSync";
import {
  minQueryLength, queryLanguage, queryVariants, rankHits, stopKindOf, type PlaceHit,
} from "./placeSearch";
import type { VehicleKind } from "./Vehicle3D";
import {
  RAIL_NOTE, locate, pointAt, useJourneyClock, useJourneyPaths,
  type LegPath, type Timeline,
} from "./routeGeometry";

const LazyVehicle3D = lazy(() => import("./Vehicle3D"));

function VehiclePreview(props: { kind: VehicleKind; progress?: number; className?: string; heading?: number }) {
  return <Suspense fallback={<div className={`${props.className ?? ""} vehicle-loading`} aria-hidden="true" />}><LazyVehicle3D {...props} /></Suspense>;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

type AppTab = "community" | "explore" | "messages" | "profile";
type Transport = VehicleKind;

function MaterialGlyph({ name }: { name: "home" | "explore" | "messages" | "person" | "add" | "settings" }) {
  return <span className="material-glyph" data-icon={name} aria-hidden="true" />;
}

type Post = {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  image: string;
  location: string;
  title: string;
  caption: string;
  likes: string;
  comments: number;
  size: "tall" | "wide" | "square";
};

const posts: Post[] = [
  {
    id: 1,
    author: "Mika Chen",
    handle: "@mika.ontheroad",
    avatar: animalAvatars.cat,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=88",
    location: "京都 · 祇园",
    title: "京都最温柔的三个清晨",
    caption: "六点的花见小路没有人群，只有木屐声和刚亮起来的纸灯。",
    likes: "12.8k",
    comments: 284,
    size: "tall",
  },
  {
    id: 2,
    author: "Noah Lee",
    handle: "@noahframes",
    avatar: animalAvatars.shiba,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=88",
    location: "东京 · 新宿",
    title: "一场蓝调时刻的城市漫游",
    caption: "从都厅一路走到歌舞伎町，东京的颜色在天黑后才真正醒来。",
    likes: "8.6k",
    comments: 136,
    size: "square",
  },
  {
    id: 3,
    author: "Aya Watanabe",
    handle: "@ayawanders",
    avatar: animalAvatars.rabbit,
    image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=1200&q=88",
    location: "山梨 · 河口湖",
    title: "在富士山醒来的早晨",
    caption: "风停以后，整个湖面像一张没有折痕的纸。",
    likes: "24.1k",
    comments: 512,
    size: "wide",
  },
  {
    id: 4,
    author: "Jun Park",
    handle: "@jun.eats.world",
    avatar: animalAvatars.panda,
    image: "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1200&q=88",
    location: "大阪 · 中崎町",
    title: "大阪的巷子，比攻略更好吃",
    caption: "没有排队名单，只有店主写在纸灯笼上的今日菜单。",
    likes: "6.3k",
    comments: 98,
    size: "tall",
  },
  {
    id: 5,
    author: "Sora Kim",
    handle: "@sora.takesoff",
    avatar: animalAvatars.fox,
    image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=88",
    location: "首尔 · 北村",
    title: "把周末留给首尔屋顶",
    caption: "一杯咖啡、两卷胶片，还有一条可以走到夜里的街。",
    likes: "9.4k",
    comments: 203,
    size: "square",
  },
  {
    id: 6,
    author: "Vincent",
    handle: "@vincent.outside",
    avatar: animalAvatars.bear,
    image: "https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1200&q=88",
    location: "香港 · 坚尼地城",
    title: "下班以后，去海边坐一站",
    caption: "电车的终点不是终点，是城市把海让出来的地方。",
    likes: "15.2k",
    comments: 367,
    size: "wide",
  },
];

const stories = [
  ["你的故事", posts[5].avatar],
  ["Mika", posts[0].avatar],
  ["Noah", posts[1].avatar],
  ["Aya", posts[2].avatar],
  ["Jun", posts[3].avatar],
  ["Sora", posts[4].avatar],
  ["Yuki", animalAvatars.bird],
] as const;

type TripStop = {
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
};

const initialTripStops: TripStop[] = [
  { id: "hkg", city: "香港", detail: "香港国际机场 · T1", code: "HKG", time: "9月18日 · 08:45", type: "flight", color: "#0a84ff", coordinate: [113.9185, 22.3080], kind: "airport", photo: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=500&q=84" },
  { id: "hnd", city: "东京", detail: "羽田机场 · T3", code: "HND", time: "9月18日 · 14:00", type: "car", color: "#ff375f", coordinate: [139.7798, 35.5494], kind: "airport", photo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=500&q=84" },
  { id: "tokyo", city: "东京", detail: "东京站 · 丸之内口", code: "TYO", time: "9月20日 · 09:10", type: "train", color: "#bf5af2", coordinate: [139.7671, 35.6812], kind: "station", photo: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=500&q=84" },
  { id: "kyoto", city: "京都", detail: "京都站 · 八条口", code: "KYO", time: "9月20日 · 11:22", type: "train", color: "#ff9f0a", coordinate: [135.7588, 34.9858], kind: "station", photo: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=84" },
  { id: "uno", city: "宇野", detail: "宇野港 · 1号码头", code: "UNO", time: "9月23日 · 10:40", type: "ferry", color: "#32ade6", coordinate: [133.9538, 34.4910], kind: "port", photo: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=500&q=84" },
  { id: "naoshima", city: "直岛", detail: "宫浦港 · 艺术岛入口", code: "NAO", time: "9月23日 · 11:00", type: "ferry", color: "#30d158", coordinate: [133.9720, 34.4563], kind: "port", photo: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=500&q=84" },
];

const transportMeta: Record<Transport, { label: string; color: string }> = {
  flight: { label: "飞机", color: "#0a84ff" },
  car: { label: "汽车", color: "#ff375f" },
  train: { label: "火车", color: "#bf5af2" },
  ferry: { label: "轮船", color: "#32ade6" },
};

/** 站点的 time 是 "9月18日 · 08:45" 这样的展示串，取日期那半用于行程标题。 */
const dayOf = (time: string) => time.split(" · ")[0] ?? time;
const conversations = [
  { id: 1, name: "Mika Chen", avatar: posts[0].avatar, preview: "京都那家旅馆我已经收藏了", time: "2分钟", unread: 2, online: true },
  { id: 2, name: "关西秋日小组", avatar: animalAvatars.koala, preview: "Noah 分享了一条新路线", time: "18分钟", unread: 5, online: false },
  { id: 3, name: "Jun Park", avatar: posts[3].avatar, preview: "一定要去试那家的关东煮！", time: "1小时", unread: 0, online: true },
  { id: 4, name: "Aya Watanabe", avatar: posts[2].avatar, preview: "照片原图发给你了", time: "昨天", unread: 0, online: false },
  { id: 5, name: "Sora Kim", avatar: posts[4].avatar, preview: "首尔见 ✈︎", time: "周六", unread: 0, online: false },
];

const navItems: Array<{ id: AppTab; label: string; outline: ElementType; fill: ElementType }> = [
  { id: "community", label: "社区", outline: SFHouse, fill: SFHouseFill },
  { id: "explore", label: "探索", outline: SFMap, fill: SFMapFill },
  { id: "messages", label: "私信", outline: SFBubbleLeftAndBubbleRight, fill: SFBubbleLeftAndBubbleRightFill },
  { id: "profile", label: "我的", outline: SFPersonCropCircle, fill: SFPersonCropCircleFill },
];

function CommunityScreen({ onCreate }: { onCreate: () => void }) {
  const [filter, setFilter] = useState("为你推荐");
  const [liked, setLiked] = useState<Set<number>>(new Set([3]));
  const [saved, setSaved] = useState<Set<number>>(new Set([1]));

  const toggleSet = (setter: typeof setLiked, id: number) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="screen community-screen">
      <header className="screen-header community-header">
        <div>
          <span className="eyebrow">COMMUNITY</span>
          <h1>发现旅程</h1>
        </div>
        <div className="header-search compact-search">
          <SFMagnifyingglass size="sm" />
          <input placeholder="搜索地点、用户或灵感" aria-label="搜索社区" />
        </div>
        <div className="header-actions">
          <button className="icon-button notification-button" aria-label="通知"><SFBell size="sm" /><i>3</i></button>
          <button className="primary-action" onClick={onCreate}><SFPlus size="xs" /> 发布</button>
        </div>
      </header>

      <div className="community-layout">
        <div className="community-main">
          <div className="stories" aria-label="旅行动态">
            {stories.map(([name, avatar], index) => (
              <button key={name} className="story">
                <span className={`story-ring ${index === 0 ? "own" : ""}`}><img src={avatar} alt="" /></span>
                <small>{name}</small>
              </button>
            ))}
          </div>

          <div className="feed-toolbar">
            <div className="filter-pills">
              {["为你推荐", "正在关注", "附近", "周末灵感"].map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
            <button className="layout-button" aria-label="切换布局"><SFRectangleGrid2x2Fill size="sm" /></button>
          </div>

          <div className="masonry-feed">
            {posts.map((post) => (
              <article className={`post-card ${post.size}`} key={post.id}>
                <div className="post-media">
                  <img src={post.image} alt={post.title} loading="lazy" />
                  <span className="location-tag"><SFLocationFill size="xs" /> {post.location}</span>
                  <button className="media-more" aria-label="更多"><SFEllipsis size="sm" /></button>
                </div>
                <div className="post-body">
                  <div className="post-author">
                    <img src={post.avatar} alt="" />
                    <span><strong>{post.author}</strong><small>{post.handle}</small></span>
                    <button>关注</button>
                  </div>
                  <h2>{post.title}</h2>
                  <p>{post.caption}</p>
                  <div className="post-actions">
                    <button className={liked.has(post.id) ? "liked" : ""} onClick={() => toggleSet(setLiked, post.id)}>
                      {liked.has(post.id) ? <SFHeartFill size="sm" /> : <SFHeart size="sm" />} <span>{post.likes}</span>
                    </button>
                    <button><SFMessage size="sm" /> <span>{post.comments}</span></button>
                    <button><SFSquareAndArrowUp size="sm" /></button>
                    <button className={`save-action ${saved.has(post.id) ? "saved" : ""}`} onClick={() => toggleSet(setSaved, post.id)}>
                      {saved.has(post.id) ? <SFBookmarkFill size="sm" /> : <SFBookmark size="sm" />}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="community-aside">
          <section className="aside-profile soft-card">
            <img src={posts[5].avatar} alt="Vincent" />
            <div><strong>Vincent</strong><span>@vincent.outside</span></div>
            <button>切换</button>
          </section>
          <section className="recommend-card soft-card">
            <div className="aside-title"><strong>值得关注</strong><button>查看全部</button></div>
            {[posts[2], posts[4], posts[3]].map((person) => (
              <div className="recommended-user" key={person.author}>
                <img src={person.avatar} alt="" />
                <span><strong>{person.author}</strong><small>{person.handle}</small></span>
                <button>关注</button>
              </div>
            ))}
          </section>
          <section className="trend-card soft-card">
            <div className="aside-title"><strong>此刻热门</strong><SFChartBarFill size="sm" /></div>
            <button><span>#</span><div><strong>九月去日本</strong><small>24.8k 篇内容</small></div><SFChevronRight size="xs" /></button>
            <button><span>#</span><div><strong>周末轻旅行</strong><small>18.2k 篇内容</small></div><SFChevronRight size="xs" /></button>
            <button><span>#</span><div><strong>城市漫步路线</strong><small>9.6k 篇内容</small></div><SFChevronRight size="xs" /></button>
          </section>
          <p className="aside-footnote">关于 · 帮助 · 隐私 · 社区规范<br />© 2026 漫游</p>
        </aside>
      </div>
    </section>
  );
}

/**
 * 可点击定位的图层。白色光晕最宽，把它算进去点击目标就更好打中；
 * 走过的白线压在彩色线上面，不算进去的话已经走过的那半段会点不动。
 */
const ROUTE_LAYERS = ["route-halo", "route-flight", "route-car", "route-rail", "route-ferry", "route-done", "route-trail"];

/**
 * 当前段的白色轨迹裁到播放头处：0..cut 全白，cut 之后透明。
 *
 * 真实路网一段能有五千多个顶点（实测东京→京都 5,253 个），每帧重传这么多坐标
 * 会让 Mapbox 一直重新切片，动画就不流畅了。改成每帧只换这条渐变 —— Mapbox 内部
 * 只更新一张 256px 的颜色纹理，顶点一次都不用重传。
 *
 * 代价是 line-progress 按墨卡托长度归一，和按弧长算的播放头有偏差：实测陆路段
 * 0.11%（不到 1 公里），香港→羽田这种跨 13 个纬度的航段最大 1.63%（约 47 公里，
 * 该缩放下约 17px），而载具模型本身就有 96px 宽，缝隙藏在机身底下看不出来。
 */
const trailGradient = (progress: number): import("mapbox-gl").ExpressionSpecification => {
  // interpolate 的停靠点必须严格递增，所以两端都要留出余量。
  const cut = Math.min(.998, Math.max(.002, progress));
  return ["interpolate", ["linear"], ["line-progress"],
    0, "#ffffff", cut, "#ffffff", cut + .001, "rgba(255,255,255,0)", 1, "rgba(255,255,255,0)"];
};

/**
 * flyTo 时给面板让出的空间，避免选中的站点被面板压住。
 *
 * 面板现在能拖能缩能隐藏，写死数值必然失真，所以直接量它的实际位置。
 * 而且要判断它贴的是哪一侧：拖到右半边之后还往左让，会正好把站点推到面板底下去。
 * 隐藏时选不到元素（带 data-hidden 的被排除），返回全零让地图用满整块。
 */
const cameraPadding = (map: import("mapbox-gl").Map) => {
  const zero = { left: 0, top: 0, right: 0, bottom: 0 };
  const panel = document.querySelector(".journey-panel:not([data-hidden])")?.getBoundingClientRect();
  if (!panel) return zero;
  const stage = map.getContainer().getBoundingClientRect();
  if (window.innerWidth <= 900) return { ...zero, bottom: Math.round(Math.min(stage.height * .62, panel.height + 20)) };
  const fromLeft = panel.right - stage.left;
  const fromRight = stage.right - panel.left;
  // 上限 62%：面板拉到很宽时，让出的padding 不能把可用视口压到没有。
  const room = Math.round(Math.min(stage.width * .62, Math.min(fromLeft, fromRight) + 20));
  return fromLeft <= fromRight ? { ...zero, left: room } : { ...zero, right: room };
};

type MapCanvasProps = {
  stops: TripStop[];
  paths: LegPath[];
  timeline: Timeline;
  /** 播放头，0..1，每帧被时钟改写。走 ref 是为了让载具逐帧动而不触发 React 重渲染。 */
  progressRef: { current: number };
  selected: number;
  mapStyle: "standard" | "satellite";
  globe: boolean;
  follow: boolean;
  picking: boolean;
  onSelect: (index: number) => void;
  onSeek: (t: number) => void;
  onFollowBreak: () => void;
  onMapPoint: (coordinate: [number, number]) => void;
};

function MapCanvas({ stops, paths, timeline, progressRef, selected, mapStyle, globe, follow, picking, onSelect, onSeek, onFollowBreak, onMapPoint }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const pinsRef = useRef<import("mapbox-gl").Marker[]>([]);
  const riderRef = useRef<import("mapbox-gl").Marker | null>(null);
  const [riderHost, setRiderHost] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  // 载具的种类和航向以低频 state 传给 Vehicle3D：Three 内部对航向做插值，
  // 所以喂粗一点的输入也能转得平滑，省下每帧一次的 React 重渲染。
  const [rider, setRider] = useState<{ kind: Transport; heading: number }>({ kind: "flight", heading: 90 });

  // rAF 循环要读这些值，但不能因为它们变化就重建循环，所以镜像到 ref。
  const live = useRef({ paths, timeline, follow, picking, onSelect, onSeek, onFollowBreak, onMapPoint });
  useEffect(() => { live.current = { paths, timeline, follow, picking, onSelect, onSeek, onFollowBreak, onMapPoint }; }, [paths, timeline, follow, picking, onSelect, onSeek, onFollowBreak, onMapPoint]);

  // 地图只创建一次。以前依赖里带着 stops，编辑一次行程就整张地图销毁重建，
  // 既丢相机位置，也是之前那次 WebGL 上下文被驱逐的同类问题。
  useEffect(() => {
    let disposed = false;
    let instance: import("mapbox-gl").Map | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapStyle === "standard" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/standard-satellite",
        projection: globe ? "globe" : "mercator",
        center: globe ? [132, 29] : [136, 33], zoom: globe ? 2.15 : 4.7, pitch: globe ? 14 : 48, bearing: -10, antialias: true, attributionControl: true,
      });
      mapRef.current = map;
      instance = map;
      map.on("style.load", () => {
        try {
          map.setConfigProperty("basemap", "lightPreset", mapStyle === "standard" ? "day" : "dusk");
          map.setConfigProperty("basemap", "show3dBuildings", !globe);
          map.setConfigProperty("basemap", "show3dLandmarks", !globe);
        } catch { /* Standard style defaults remain active. */ }
        map.setFog(globe ? { color: "rgb(228, 238, 250)", "high-color": "rgb(119, 171, 229)", "space-color": "rgb(4, 11, 26)", "horizon-blend": .14, "star-intensity": .45 } : {});

        const empty = { type: "FeatureCollection" as const, features: [] };
        map.addSource("journey", { type: "geojson", data: empty, lineMetrics: true });
        // lineMetrics 是 line-gradient 的前提：没有它 line-progress 取不到值。
        map.addSource("journey-trail", { type: "geojson", data: empty, lineMetrics: true });
        map.addLayer({ id: "route-halo", type: "line", source: "journey", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": .72, "line-blur": 1.5 } });
        map.addLayer({ id: "route-flight", type: "line", source: "journey", filter: ["==", ["get", "mode"], "flight"], layout: { "line-cap": "round" }, paint: { "line-color": "#0a84ff", "line-width": 3.2, "line-dasharray": [1, 1.4] } });
        map.addLayer({ id: "route-car", type: "line", source: "journey", filter: ["==", ["get", "mode"], "car"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ff375f", "line-width": 3.2 } });
        map.addLayer({ id: "route-rail", type: "line", source: "journey", filter: ["==", ["get", "mode"], "train"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#bf5af2", "line-width": 3.2 } });
        map.addLayer({ id: "route-ferry", type: "line", source: "journey", filter: ["==", ["get", "mode"], "ferry"], layout: { "line-cap": "round" }, paint: { "line-color": "#32ade6", "line-width": 3.2, "line-dasharray": [.6, 1.2] } });
        // 已经走过的部分：压在彩色线之上，让播放进度在地图上也读得出来。
        // 整段走完的用纯白一层，当前这一段单独一层、用渐变裁开，两层同源靠 done 属性区分。
        map.addLayer({ id: "route-done", type: "line", source: "journey-trail", filter: ["==", ["get", "done"], true], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 4.4, "line-opacity": .95, "line-blur": .2 } });
        map.addLayer({ id: "route-trail", type: "line", source: "journey-trail", filter: ["==", ["get", "done"], false], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-gradient": trailGradient(0), "line-width": 4.4, "line-opacity": .95, "line-blur": .2 } });

        const host = document.createElement("div");
        host.className = "map-rider";
        riderRef.current = new mapboxgl.Marker({ element: host, pitchAlignment: "viewport", rotationAlignment: "viewport" })
          .setLngLat(stops[0]?.coordinate ?? [0, 0])
          .addTo(map);
        setRiderHost(host);
        setReady(true);
      });

      // 点线上任意位置即跳到那一刻，行程线本身也是可交互的控件。
      map.on("click", ROUTE_LAYERS, (event) => {
        let best = { distance: Infinity, leg: 0, t: 0 };
        live.current.paths.forEach((path, legIndex) => {
          path.coordinates.forEach((coordinate, index) => {
            const distance = (coordinate[0] - event.lngLat.lng) ** 2 + (coordinate[1] - event.lngLat.lat) ** 2;
            if (distance < best.distance) best = { distance, leg: legIndex, t: path.km ? path.cumulativeKm[index] / path.km : 0 };
          });
        });
        const leg = live.current.timeline.legs[best.leg];
        if (leg) live.current.onSeek(leg.from + (leg.to - leg.from) * best.t);
      });
      map.on("click", (event) => {
        if (!live.current.picking) return;
        const layers = ROUTE_LAYERS.filter((layer) => Boolean(map.getLayer(layer)));
        if (layers.length && map.queryRenderedFeatures(event.point, { layers }).length) return;
        live.current.onMapPoint([event.lngLat.lng, event.lngLat.lat]);
      });
      map.on("mouseenter", ROUTE_LAYERS, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", ROUTE_LAYERS, () => { map.getCanvas().style.cursor = live.current.picking ? "crosshair" : ""; });
      // 用户一开始拖地图就把跟随交还给他，像导航软件那样。
      map.on("dragstart", () => { if (live.current.follow) live.current.onFollowBreak(); });
    });
    return () => {
      disposed = true;
      pinsRef.current = [];
      riderRef.current = null;
      mapRef.current = null;
      instance?.remove();
    };
    // 底图常量、首站坐标只用于初始化，不需要重建地图。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = picking ? "crosshair" : "";
  }, [picking, ready]);

  // 线形变了就只换 source 数据，不动地图实例。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("journey") as import("mapbox-gl").GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: paths.map((path, index) => ({
        type: "Feature" as const,
        properties: { mode: path.mode, leg: index, source: path.source },
        geometry: { type: "LineString" as const, coordinates: path.coordinates },
      })),
    });
  }, [paths, ready]);

  // 站点标记按 stops 重建。六个 DOM marker，整体换掉比逐个 diff 更不容易出错。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelled) return;
      for (const marker of pinsRef.current) marker.remove();
      pinsRef.current = stops.map((stop, index) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "route-pin";
        element.dataset.index = String(index);
        element.style.setProperty("--pin", stop.color);
        element.textContent = String(index + 1);
        element.setAttribute("aria-label", `${stop.city} · 第 ${index + 1} 站`);
        element.addEventListener("click", () => live.current.onSelect(index));
        return new mapboxgl.Marker({ element, anchor: "bottom" }).setLngLat(stop.coordinate).addTo(map);
      });
    });
    return () => { cancelled = true; };
  }, [stops, ready]);

  // 逐帧驱动载具：位置命令式写进 marker，不经过 React，所以是真正的 60fps。
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    let tick = 0;
    let publishedKind: Transport | null = null;
    let publishedHeading = 0;
    let publishedLeg = -1;
    let publishedPaths: LegPath[] | null = null;
    let centerLon = 0;
    let centerLat = 0;
    let centerPrimed = false;

    const step = () => {
      frame = requestAnimationFrame(step);
      const map = mapRef.current;
      const { paths: livePaths, timeline: liveTimeline } = live.current;
      if (!map || !livePaths.length) return;
      const { legIndex, legProgress } = locate(liveTimeline, progressRef.current);
      const path = livePaths[Math.min(legIndex, livePaths.length - 1)];
      if (!path) return;
      const { coordinate, bearing } = pointAt(path, legProgress);
      riderRef.current?.setLngLat(coordinate);

      // 屏幕航向 = 真实方位角 - 地图旋转角，地图转的时候机头才不会跟着歪。
      const screenHeading = (bearing - map.getBearing() + 360) % 360;
      const turned = Math.abs(((screenHeading - publishedHeading + 540) % 360) - 180);
      if (path.mode !== publishedKind || turned > 4) {
        publishedKind = path.mode;
        publishedHeading = screenHeading;
        setRider({ kind: path.mode, heading: screenHeading });
      }

      tick += 1;
      // 几何只在换段（或线形本身变了）时上传一次：走完的段标 done，当前段留给渐变裁。
      if (legIndex !== publishedLeg || livePaths !== publishedPaths) {
        publishedLeg = legIndex;
        publishedPaths = livePaths;
        const trail = map.getSource("journey-trail") as import("mapbox-gl").GeoJSONSource | undefined;
        trail?.setData({
          type: "FeatureCollection",
          features: livePaths.slice(0, legIndex + 1).map((leg, index) => ({
            type: "Feature" as const,
            properties: { done: index < legIndex },
            geometry: { type: "LineString" as const, coordinates: leg.coordinates },
          })),
        });
      }
      // 渐变每两帧更一次：30Hz 的边缘推进已经看不出台阶，
      // 而且不跟随时地图本来是静止的，少一半强制重绘。
      if (tick % 2 === 0) map.setPaintProperty("route-trail", "line-gradient", trailGradient(legProgress));

      if (live.current.follow) {
        // 相机用插值追上去而不是硬设中心，快段慢段都不会甩镜头。
        if (!centerPrimed) {
          centerLon = coordinate[0];
          centerLat = coordinate[1];
          centerPrimed = true;
        }
        centerLon += (coordinate[0] - centerLon) * .06;
        centerLat += (coordinate[1] - centerLat) * .06;
        map.jumpTo({ center: [centerLon, centerLat] });
      } else {
        centerPrimed = false;
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ready, progressRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const stop = stops[selected];
    if (!stop) return;
    map.flyTo({ center: stop.coordinate, zoom: globe ? 4.6 : stop.kind === "airport" ? 10.6 : 12.2, pitch: globe ? 24 : 58, bearing: -16, duration: 1200, essential: true, padding: cameraPadding(map) });
    containerRef.current?.querySelectorAll<HTMLElement>(".route-pin").forEach((pin) => pin.classList.toggle("active", pin.dataset.index === String(selected)));
  }, [selected, ready, globe, stops]);

  return (
    <div className={`map-canvas ${picking ? "is-picking" : ""}`} ref={containerRef}>
      {riderHost && createPortal(<VehiclePreview kind={rider.kind} heading={rider.heading} className="rider-model" />, riderHost)}
    </div>
  );
}

const SPEED_MIN = .1;
const SPEED_MAX = 2;
/** 0.05 一档，2 到 0.1 之间 38 档 —— 拖起来是连续的，又不会出现 0.8700000001 这种数。 */
const SPEED_STEP = .01;
/** 1× 显示成「1×」而不是「1.00×」，0.85 才显示两位。 */
const speedLabel = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, "")}×`;

type SuggestRow = { mapbox_id: string; name: string; full_address?: string; place_formatted?: string; feature_type?: string; poi_category?: string[] };
type GeocodeRow = {
  id?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; place_formatted?: string; full_address?: string; feature_type?: string; coordinates?: { longitude: number; latitude: number } };
};

/** 搜索一次要发好几个请求，逐个写 try/catch 太吵；HTTP 错误在这儿就变成异常，由调用方统一兜。 */
async function fetchJson(url: URL, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`${response.status} ${url.pathname}`);
  return response.json();
}

function ExploreScreen() {
  const [stops, setStops] = useState<TripStop[]>(initialTripStops);
  const [selectedStop, setSelectedStop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [follow, setFollow] = useState(true);
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ coordinate: [number, number]; name: string; address: string } | null>(null);
  const [clockMode, setClockMode] = useState<JourneyClockMode>("preview");
  const [journeyStart, setJourneyStart] = useState("2026-09-18T08:45");
  const [journeyEnd, setJourneyEnd] = useState("2026-09-27T19:30");
  // 底图固定为地球仪 + 标准地图：投影和样式不再暴露给用户切换。
  // MapCanvas 仍保留两种分支，换默认值即可，不必改渲染层。
  const globe = true;
  const mapStyle: "standard" | "satellite" = "standard";
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  // 唯一面板的分段：行程列表 / 当前站点详情 / 载具。取代原先四块各自漂浮的卡片。
  const [panel, setPanel] = useState<"route" | "place" | "fleet">("route");
  // 面板的显隐。位置和尺寸由 JourneyPanel 自己管，只有「在不在」需要这一层知道 ——
  // 键盘的 J 和相机让位都要读它。
  const [panelHidden, setPanelHidden] = useState(false);  const [transport, setTransport] = useState<Transport>("flight");
  const [query, setQuery] = useState("");
  const [departureTime, setDepartureTime] = useState("2026-09-24T09:30");
  const [suggestions, setSuggestions] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionToken = useRef("");
  const selectStop = useCallback((index: number) => setSelectedStop(index), []);

  // 真实线形：飞机轮船走大圆，汽车火车拉 Mapbox 路网，取不到就退回大圆。
  const { paths, timeline, pendingRoads } = useJourneyPaths(stops, MAPBOX_TOKEN);
  const { progressRef, progress, seek } = useJourneyClock(isPlaying, speed);
  const liveWindow = useMemo(() => parseJourneyWindow(journeyStart, journeyEnd), [journeyStart, journeyEnd]);

  useEffect(() => {
    if (clockMode !== "live" || !liveWindow) return;
    const update = () => seek(timelineProgressAt(Date.now(), liveWindow.startMs, liveWindow.endMs));
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [clockMode, liveWindow, seek]);

  useEffect(() => {
    sessionToken.current = globalThis.crypto?.randomUUID?.() ?? "manyou-search-session";
  }, []);

  /**
   * 一次输入并发查几种「说法」：原文、日文写法、剥掉通名的专名。
   * 为什么要这么绕见 placeSearch.ts 顶部 —— 简单说就是 Mapbox 的 POI 索引没有中文名，
   * 「成田国际机场」原样查回来的是马来西亚民宿，换成「成田空港」第一条就对。
   */
  useEffect(() => {
    const value = query.trim();
    if (!adding) return;
    if (value.length < minQueryLength(value)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const token = sessionToken.current || "manyou-search-session";
      const calls: Array<Promise<Array<Omit<PlaceHit, "score">>>> = [];

      for (const variant of queryVariants(value)) {
        // 每条结果都记下是哪个说法查出来的：rankHits 要按它再打一次分，
        // 否则「京都駅」这种改写出来的命中会被原始输入「京都站」扣掉分。
        // trusted 标记的是别名桥那一路 —— 它连文字都不沾，打分要走另一条分支。
        const via = { query: variant.q, fidelity: variant.fidelity, trusted: variant.trust };
        if (variant.engines.includes("poi")) {
          const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
          url.searchParams.set("q", variant.q);
          url.searchParams.set("language", variant.language);
          url.searchParams.set("limit", "8");
          url.searchParams.set("session_token", token);
          // 大中华区的枢纽要收窄到国家，否则同名的外国小镇会顶掉真正的城市。见 SCOPES。
          if (variant.country) url.searchParams.set("country", variant.country);
          url.searchParams.set("access_token", MAPBOX_TOKEN);
          calls.push(fetchJson(url, controller.signal).then((data) =>
            ((data as { suggestions?: SuggestRow[] }).suggestions ?? []).map((row, rank) => ({
              id: `poi:${row.mapbox_id}`,
              name: row.name,
              address: row.place_formatted ?? row.full_address ?? "",
              featureType: row.feature_type ?? "poi",
              categories: row.poi_category ?? [],
              engine: "poi" as const,
              rank,
              ...via,
            }))));
        }
        if (variant.engines.includes("geocode")) {
          const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
          url.searchParams.set("q", variant.q);
          url.searchParams.set("language", variant.language);
          url.searchParams.set("limit", "8");
          url.searchParams.set("autocomplete", "true");
          if (variant.country) url.searchParams.set("country", variant.country);
          url.searchParams.set("access_token", MAPBOX_TOKEN);
          calls.push(fetchJson(url, controller.signal).then((data) =>
            ((data as { features?: GeocodeRow[] }).features ?? []).flatMap((feature, rank) => {
              // v6 的坐标同时挂在 geometry 和 properties 上，两边都读一下，谁在用谁。
              const coordinate = feature.geometry?.coordinates
                ?? (feature.properties?.coordinates && [feature.properties.coordinates.longitude, feature.properties.coordinates.latitude] as [number, number]);
              if (!coordinate) return [];
              return [{
                id: `geo:${feature.id ?? coordinate.join(",")}`,
                name: feature.properties?.name ?? "",
                address: feature.properties?.place_formatted ?? feature.properties?.full_address ?? "",
                featureType: feature.properties?.feature_type ?? "place",
                categories: [] as string[],
                coordinate,
                engine: "geocode" as const,
                rank,
                ...via,
              }];
            })));
        }
      }

      // 一路失败不该拖垮其他路：单个请求挂了就当它返回空。
      const batches = await Promise.all(calls.map((call) => call.catch(() => [])));
      if (controller.signal.aborted) return;
      setSuggestions(rankHits(value, batches.flat()));
      setSearching(false);
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [adding, query]);

  const commitStop = useCallback((place: { name: string; address: string; coordinate: [number, number]; categories?: string[]; featureType?: string }) => {
    const date = new Date(departureTime);
    const timeLabel = Number.isNaN(date.getTime()) ? "待定" : `${date.getMonth() + 1}月${date.getDate()}日 · ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const nextStop: TripStop = {
      id: `place-${Date.now()}`,
      city: place.name,
      detail: place.address || "地图选点",
      time: timeLabel,
      type: transport,
      color: transportMeta[transport].color,
      coordinate: place.coordinate,
      kind: stopKindOf(place.featureType ?? "place", place.categories ?? [], place.name),
      photo: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=500&q=84",
    };
    setStops((current) => {
      setSelectedStop(current.length);
      return [...current, nextStop];
    });
    setAdding(false);
    setMapDraft(null);
    setQuery("");
    setSuggestions([]);
    sessionToken.current = globalThis.crypto?.randomUUID?.() ?? "manyou-search-session";
  }, [departureTime, transport]);

  const addSuggestion = async (hit: PlaceHit) => {
    setSearching(true);
    try {
      let coordinate = hit.coordinate;
      let name = hit.name;
      let address = hit.address;
      let categories = hit.categories;
      // Search Box 的 suggestion 只有 id，坐标要再换一次；Geocoding 的已经带坐标了。
      if (!coordinate) {
        const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(hit.id.replace(/^poi:/, ""))}`);
        url.searchParams.set("session_token", sessionToken.current || "manyou-search-session");
        url.searchParams.set("language", queryLanguage(hit.name));
        url.searchParams.set("access_token", MAPBOX_TOKEN);
        const data = await fetchJson(url) as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string; place_formatted?: string; feature_type?: string; poi_category?: string[] } }> };
        const feature = data.features?.[0];
        coordinate = feature?.geometry?.coordinates;
        name = feature?.properties?.name ?? name;
        address = feature?.properties?.full_address ?? feature?.properties?.place_formatted ?? address;
        categories = feature?.properties?.poi_category ?? categories;
      }
      if (!coordinate) return;
      commitStop({ name, address, coordinate, categories, featureType: hit.featureType });
    } finally {
      setSearching(false);
    }
  };

  const selectMapPoint = useCallback(async (coordinate: [number, number]) => {
    setPickingOnMap(false);
    setAdding(true);
    setSearching(true);
    setQuery("");
    let name = "地图选点";
    let address = `${coordinate[1].toFixed(5)}, ${coordinate[0].toFixed(5)}`;
    try {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
      url.searchParams.set("longitude", String(coordinate[0]));
      url.searchParams.set("latitude", String(coordinate[1]));
      url.searchParams.set("language", "zh-Hans");
      url.searchParams.set("access_token", MAPBOX_TOKEN);
      const data = await fetchJson(url) as { features?: GeocodeRow[] };
      const feature = data.features?.[0]?.properties;
      name = feature?.name || name;
      address = feature?.full_address || feature?.place_formatted || address;
    } catch { /* Coordinates still form a valid stop when reverse geocoding is unavailable. */ }
    setMapDraft({ coordinate, name, address });
    setSearching(false);
  }, []);

  const selected = stops[selectedStop] ?? stops[0];
  const segmentCount = Math.max(1, paths.length);
  const { legIndex: activeSegmentIndex } = locate(timeline, progress);
  const activePath = paths[activeSegmentIndex];
  const activeTransport = activePath?.mode ?? stops[0]?.type ?? "flight";
  const activeFrom = stops[activeSegmentIndex] ?? stops[0];
  const activeTo = stops[activeSegmentIndex + 1] ?? stops[1] ?? stops[0];
  const liveStatus = liveJourneyStatus(progress);
  const liveStatusLabel = liveStatus === "waiting" ? "等待出发" : liveStatus === "arrived" ? "已经到达" : "与真实时间同步";
  const transportIcon = (type: Transport, size: "xs" | "sm" = "sm") => type === "flight" ? <SFAirplane size={size} /> : type === "car" ? <SFCarFill size={size} /> : type === "ferry" ? <SFFerryFill size={size} /> : <SFTrainSideFrontCar size={size} />;

  // 里程和交通统计全部来自真实线形：路网段是沿路累加，大圆段是球面真值。
  const totalKm = useMemo(() => paths.reduce((sum, path) => sum + path.km, 0), [paths]);
  const legsByTransport = useMemo(() => {
    const table = { flight: 0, car: 0, train: 0, ferry: 0 } as Record<Transport, number>;
    for (const path of paths) table[path.mode] += 1;
    return table;
  }, [paths]);
  const transportKinds = (Object.values(legsByTransport) as number[]).filter(Boolean).length;
  const roadLegs = paths.filter((path) => path.source === "road").length;
  const dateRange = stops.length > 1 ? `${dayOf(stops[0].time)} – ${dayOf(stops[stops.length - 1].time)}` : dayOf(stops[0].time);
  const kindLabel = (kind: TripStop["kind"]) => kind === "airport" ? "机场" : kind === "station" ? "车站" : kind === "port" ? "港口" : "景点";
  /** 搜索结果的图标按站点类型给，比一律用图钉更能让人一眼分出机场和车站。 */
  const stopIcon = (kind: TripStop["kind"]) => kind === "airport" ? <SFAirplane size="sm" /> : kind === "station" ? <SFTrainSideFrontCar size="sm" /> : kind === "port" ? <SFFerryFill size="sm" /> : <SFLocationFill size="sm" />;
  const hubCode = (stop: TripStop) => stop.code ?? (stop.kind === "airport" ? "AIR" : stop.kind === "station" ? "JR" : stop.kind === "port" ? "PORT" : "POI");

  /**
   * 查询词太短时不清 state、只是不渲染 —— 清 state 得在 effect 里同步 setState，
   * 那会多走一轮渲染。派生一个值出来，三处渲染分支读同一个真相，也不用把
   * minQueryLength(query.trim()) 抄三遍。
   */
  const trimmedQuery = query.trim();
  const queryTooShort = trimmedQuery.length < minQueryLength(trimmedQuery);
  const visibleHits = queryTooShort ? [] : suggestions;

  /**
   * 把播放头移到第 index 站的出发时刻，面板和相机一起跟过去。
   * 参数是站点序号：第 i 站的出发时刻正好是第 i 段的起点，两种调用方（点站点、切段）
   * 因此可以共用。最后一站没有「出发」，它对应的是全程终点，直接收到 1。
   */
  const gotoLeg = useCallback((index: number) => {
    const stopIndex = Math.min(stops.length - 1, Math.max(0, index));
    const leg = timeline.legs[stopIndex];
    seek(leg ? leg.from : 1);
    setSelectedStop(stopIndex);
  }, [stops.length, timeline, seek]);

  const stepLeg = useCallback((direction: number) => {
    const { legIndex, legProgress } = locate(timeline, progressRef.current);
    // 后退先回到本段起点，跟播放器的「上一首」一个手感；已经在起点了才真的退一段。
    gotoLeg(direction < 0 && legProgress > .02 ? legIndex : legIndex + direction);
  }, [gotoLeg, timeline, progressRef]);

  const jumpToTransport = (type: Transport) => {
    const index = paths.findIndex((path) => path.mode === type);
    if (index >= 0) gotoLeg(index);
  };

  // ---- 行程编辑：删除、上下移动、逐段改交通方式 ----
  const removeStop = (index: number) => {
    // 少于两站就不成行程了，线形和时间轴都会退化成空。
    if (stops.length <= 2) return;
    setStops((current) => current.filter((_, position) => position !== index));
    setSelectedStop((current) => Math.max(0, Math.min(current > index ? current - 1 : current, stops.length - 2)));
  };

  const moveStop = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    setStops((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSelectedStop(target);
  };

  /** 每站的 type 表示「从这里出发怎么走」，所以改的是这一段的交通方式。 */
  const setLegMode = (index: number, mode: Transport) => {
    setStops((current) => current.map((stop, position) => position === index
      ? { ...stop, type: mode, color: transportMeta[mode].color }
      : stop));
  };

  // ---- 进度条拖拽：按下时暂停，松手恢复原来的播放状态 ----
  const scrubRef = useRef<HTMLDivElement>(null);
  const resumeAfterScrub = useRef(false);
  const scrubTo = (clientX: number) => {
    const rect = scrubRef.current?.getBoundingClientRect();
    if (rect?.width) seek((clientX - rect.left) / rect.width);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || target?.isContentEditable) return;
      if (event.code === "Space") {
        if (clockMode === "live") return;
        // 空格是按钮和链接自身的激活键。焦点在它们上面时不能抢，
        // 否则键盘用户按「编辑」「删除」都会变成播放/暂停。
        if (/^(BUTTON|A|SUMMARY)$/.test(tag)) return;
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
      else if (event.key === "ArrowRight") { event.preventDefault(); stepLeg(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); stepLeg(-1); }
      else if (event.key === "f" || event.key === "F") setFollow((value) => !value);
      else if (event.key === "j" || event.key === "J") setPanelHidden((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clockMode, stepLeg]);

  return (
    <section className="screen explore-screen journey-globe-screen">
      <MapCanvas
        stops={stops} paths={paths} timeline={timeline} progressRef={progressRef}
        selected={selectedStop} mapStyle={mapStyle} globe={globe} follow={follow} picking={pickingOnMap}
        onSelect={selectStop} onSeek={seek} onFollowBreak={() => setFollow(false)} onMapPoint={selectMapPoint}
      />
      <header className="globe-bar frosted-panel">
        {/* 顶栏这一格原先只有占位文字，输进去的字没人接。现在它和弹层共用 query：
            聚焦就展开弹层，打过的字直接带过去，不用再打一遍。 */}
        <div className="globe-search"><SFMagnifyingglass size="sm" /><input value={adding ? "" : query} placeholder="搜索机场、车站、港口或景点" aria-label="搜索地图" onFocus={() => setAdding(true)} onChange={(event) => { setQuery(event.target.value); setAdding(true); }} /></div>
        <button type="button" className={`map-pick-button ${pickingOnMap ? "on" : ""}`} aria-pressed={pickingOnMap} onClick={() => { setPickingOnMap((value) => !value); setAdding(false); }}><SFPlus size="xs" /><span>{pickingOnMap ? "点地图" : "地图选点"}</span></button>
        <button type="button" className={`icon-button ${follow ? "on" : ""}`} aria-pressed={follow} aria-label="镜头跟随载具（F）" title="镜头跟随载具（F）" onClick={() => setFollow(!follow)}><SFLocationNorthFill size="sm" /></button>
        <button className="icon-button" aria-label="分享行程"><SFSquareAndArrowUp size="sm" /></button>
      </header>

      <JourneyPanel hidden={panelHidden} onHide={() => setPanelHidden(true)} onShow={() => setPanelHidden(false)}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">LIVE JOURNEY</span>
            <h1>日本，秋天</h1>
            <p>{dateRange} · {stops.length}站 · {transportKinds}种交通 · {Math.round(totalKm).toLocaleString("en-US")}公里</p>
            <p className="panel-source" title={RAIL_NOTE}>
              {pendingRoads > 0 ? `正在取真实路网…剩 ${pendingRoads} 段` : roadLegs > 0 ? `${roadLegs} 段真实路网 · 其余大圆航线` : "全程大圆航线"}
            </p>
          </div>
          <button type="button" className={`panel-edit ${editing ? "active" : ""}`} onClick={() => setEditing(!editing)}>{editing ? "完成" : "编辑"}</button>
        </div>

        <div className="clock-sync-card">
          <div className="clock-mode-switch" role="group" aria-label="动画时间模式">
            <button type="button" className={clockMode === "preview" ? "active" : ""} onClick={() => setClockMode("preview")}>预览动画</button>
            <button type="button" className={clockMode === "live" ? "active" : ""} onClick={() => { setIsPlaying(false); setClockMode("live"); }}>真实时间</button>
          </div>
          {clockMode === "live" && <div className="clock-window-fields">
            <label><span>出发</span><input type="datetime-local" value={journeyStart} onChange={(event) => setJourneyStart(event.target.value)} /></label>
            <label><span>到达</span><input type="datetime-local" value={journeyEnd} onChange={(event) => setJourneyEnd(event.target.value)} /></label>
            <small className={liveWindow ? "valid" : "invalid"}>{liveWindow ? `● ${liveStatusLabel}` : "结束时间必须晚于出发时间"}</small>
          </div>}
        </div>

        <div className="panel-player">
          <button type="button" className="player-button" disabled={clockMode === "live"} aria-label={clockMode === "live" ? liveStatusLabel : isPlaying ? "暂停行程动画（空格）" : "播放行程动画（空格）"} onClick={() => setIsPlaying(!isPlaying)}>{clockMode === "live" ? <SFClock size="sm" /> : isPlaying ? <SFPauseFill size="sm" /> : <SFPlayFill size="sm" />}</button>
          <VehiclePreview kind={activeTransport} progress={progress * 100} className="player-vehicle" />
          <div className="player-copy">
            <span className="player-leg">
              <button type="button" className="leg-step" aria-label="上一段（←）" onClick={() => stepLeg(-1)}><SFChevronLeft size="xs" /></button>
              <strong>{activeFrom.city}</strong>{transportIcon(activeTransport, "xs")}<strong>{activeTo.city}</strong>
              <button type="button" className="leg-step" aria-label="下一段（→）" onClick={() => stepLeg(1)}><SFChevronRight size="xs" /></button>
            </span>
            <div
              ref={scrubRef} className={`route-progress ${clockMode === "live" ? "locked" : ""}`} role="slider" tabIndex={clockMode === "live" ? -1 : 0}
              aria-disabled={clockMode === "live"}
              aria-label="行程动画进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
              onPointerDown={(event) => {
                if (clockMode === "live") return;
                event.currentTarget.setPointerCapture(event.pointerId);
                resumeAfterScrub.current = isPlaying;
                setIsPlaying(false);
                scrubTo(event.clientX);
              }}
              onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubTo(event.clientX); }}
              onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); if (resumeAfterScrub.current) setIsPlaying(true); }}
              onKeyDown={(event) => {
                // 焦点在进度条上时四个方向键都是细调（横向滑块的惯例是左右），
                // 并且要 stopPropagation，否则左右键会冒到窗口那层去切换段落。
                const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? .02
                  : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -.02 : 0;
                if (!step || clockMode === "live") return;
                event.preventDefault();
                event.stopPropagation();
                seek(progressRef.current + step);
              }}
            ><i style={{ width: `${progress * 100}%` }} /><b style={{ left: `${progress * 100}%` }} /></div>
            <small>
              第 {activeSegmentIndex + 1}/{segmentCount} 段 · {transportMeta[activeTransport].label}
              {activePath ? ` · ${Math.round(activePath.km).toLocaleString("en-US")}公里 · ${routeRuleFor(activePath.mode).geometry === "road" ? "真实公路" : routeRuleFor(activePath.mode).label + "规则"}` : ""}
            </small>
          </div>
          {/* 速度是无级的：原生 range 免费带来键盘、触摸和读屏支持，手写一遍不值得。
              双击数值回到 1×，比拖回去准。 */}
          <label className={`player-speed ${clockMode === "live" ? "disabled" : ""}`} title={clockMode === "live" ? "真实时间模式由行程时间决定速率" : `播放速度 ${speedLabel(speed)}，双击数字回到 1×`}>
            <b onDoubleClick={() => setSpeed(1)}>{speedLabel(speed)}</b>
            <input
              type="range" min={SPEED_MIN} max={SPEED_MAX} step={SPEED_STEP} value={speed} disabled={clockMode === "live"}
              aria-label="播放速度" aria-valuetext={`${speedLabel(speed)}速`}
              onChange={(event) => setSpeed(Number(event.target.value))}
              // 不拦的话左右键会冒到窗口那层去切换行程段落，滑块就调不动了。
              onKeyDown={(event) => { if (event.key.startsWith("Arrow")) event.stopPropagation(); }}
            />
          </label>
        </div>

        <div className="panel-tabs" role="tablist" aria-label="行程面板">
          {([["route", `行程 ${stops.length}`], ["place", "站点"], ["fleet", "载具"]] as const).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={panel === key} className={panel === key ? "active" : ""} onClick={() => setPanel(key)}>{label}</button>
          ))}
        </div>

        <div className="panel-body" role="tabpanel">
          {panel === "route" && <div className="stop-list">
            {stops.map((stop, index) => <div key={stop.id} className={`stop-row ${selectedStop === index ? "selected" : ""} ${editing ? "editing" : ""}`}>
              <button type="button" className="stop-main" aria-current={selectedStop === index} onClick={() => selectedStop === index ? setPanel("place") : gotoLeg(index)}>
                <span className="stop-node" style={{ background: stop.color }}>{index < stops.length - 1 ? transportIcon(stop.type, "xs") : <SFLocationFill size="xs" />}</span>
                <span className="stop-copy"><strong>{stop.city}</strong><small>{stop.time} · {stop.detail}</small></span>
              </button>
              {editing ? <span className="stop-tools">
                {index < stops.length - 1 && <label className="stop-mode-select" title={routeRuleFor(stop.type).note}><span>{transportIcon(stop.type, "xs")}</span><select aria-label={`${stop.city}出发的交通方式`} value={stop.type} onChange={(event) => setLegMode(index, event.target.value as Transport)}>{(Object.keys(transportMeta) as Transport[]).map((mode) => <option key={mode} value={mode}>{transportMeta[mode].label}</option>)}</select></label>}
                <button type="button" aria-label="上移一位" disabled={index === 0} onClick={() => moveStop(index, -1)}>↑</button>
                <button type="button" aria-label="下移一位" disabled={index === stops.length - 1} onClick={() => moveStop(index, 1)}>↓</button>
                <button type="button" className="stop-remove" aria-label={`删除 ${stop.city}`} disabled={stops.length <= 2} onClick={() => removeStop(index)}><SFXmark size="xs" /></button>
              </span> : <span className="stop-tail">
                <span className="stop-code">{hubCode(stop)}</span>
                {selectedStop === index && <SFChevronRight size="xs" />}
              </span>}
            </div>)}
            <button type="button" className="stop-add" onClick={() => setAdding(true)}><span><SFPlus size="xs" /></span><span className="stop-copy"><strong>添加真实地点</strong><small>机场、车站、港口、景点</small></span></button>
          </div>}

          {panel === "place" && <div className="stop-detail">
            <div className="place-photo" style={{ backgroundImage: `url(${selected.photo})` }}><span>{kindLabel(selected.kind)}</span>{selected.code && <strong>{selected.code}</strong>}</div>
            <div className="place-copy"><small>{selected.time}</small><h2>{selected.city}</h2><p>{selected.detail}</p></div>
            <div className="checkin-row"><span><SFCheckmarkCircleFill size="sm" /><b>3</b><small>打卡景点</small></span><span><SFPhotoFill size="sm" /><b>12</b><small>旅途照片</small></span><span><SFCloudSunFill size="sm" /><b>23°</b><small>局部多云</small></span></div>
            <div className="photo-strip"><img src={selected.photo} alt={`${selected.city} 行程照片`} /><img src={posts[(selectedStop + 1) % posts.length].image} alt={`${selected.city} 行程照片`} /><button type="button"><SFCameraFill size="sm" /><small>添加</small></button></div>
          </div>}

          {panel === "fleet" && <div className="fleet-grid" aria-label="3D 交通工具模型">
            {(Object.keys(transportMeta) as Transport[]).map((type) => <button key={type} type="button" className={activeTransport === type ? "active" : ""} disabled={!legsByTransport[type]} onClick={() => jumpToTransport(type)}>
              <VehiclePreview kind={type} />
              <strong>{transportMeta[type].label}</strong>
              <small>{legsByTransport[type] ? `${legsByTransport[type]} 段行程` : "本次未使用"}</small>
            </button>)}
          </div>}
        </div>
      </JourneyPanel>

      {adding && <div className="journey-modal-backdrop" role="button" tabIndex={0} aria-label="关闭添加地点" onClick={(event) => { if (event.target === event.currentTarget) { setAdding(false); setMapDraft(null); } }} onKeyDown={(event) => { if (event.key === "Escape") { setAdding(false); setMapDraft(null); } }}>
        <section className="add-place-sheet frosted-panel" role="dialog" aria-modal="true" aria-label="添加行程地点">
          <header><div><span className="eyebrow">ADD A STOP</span><h2>添加行程地点</h2><p>搜索真实机场、车站、港口与打卡景点</p></div><button className="icon-button" aria-label="关闭" onClick={() => { setAdding(false); setMapDraft(null); }}><SFXmark size="sm" /></button></header>
          {/* 弹层一打开就把焦点送进搜索框：ARIA 的 dialog 模式要求焦点必须移进对话框，
              而这里第一件事一定是打字。规则判不出「这是模态框的初始焦点」，所以局部豁免。 */}
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <label className="add-search"><SFMagnifyingglass size="sm" /><input value={query} autoFocus onChange={(event) => setQuery(event.target.value)} placeholder="任意语言都行：成田国际机场 / 京都駅 / Seoul Station" />{searching && <i />}</label>
          <div className="add-form-row"><label><span>出发时间</span><input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} /></label><label><span>交通工具</span><select value={transport} onChange={(event) => setTransport(event.target.value as Transport)}>{(Object.keys(transportMeta) as Transport[]).map((type) => <option key={type} value={type}>{transportMeta[type].label}</option>)}</select></label></div>
          <div className="vehicle-picker">{(Object.keys(transportMeta) as Transport[]).map((type) => <button key={type} className={transport === type ? "active" : ""} onClick={() => setTransport(type)}><VehiclePreview kind={type} /><span>{transportMeta[type].label}</span></button>)}</div>
          <div className="suggestion-list">
            {mapDraft && <article className="map-draft-card"><span><SFLocationFill size="sm" /></span><div><strong>{mapDraft.name}</strong><small>{mapDraft.address}</small><small>{mapDraft.coordinate[1].toFixed(5)}, {mapDraft.coordinate[0].toFixed(5)}</small></div><button type="button" onClick={() => commitStop(mapDraft)}>添加到行程</button></article>}
            {visibleHits.map((hit) => <button key={hit.id} onClick={() => void addSuggestion(hit)}><span>{stopIcon(stopKindOf(hit.featureType, hit.categories, hit.name))}</span><div><strong>{hit.name}</strong><small>{hit.address || kindLabel(stopKindOf(hit.featureType, hit.categories, hit.name))}</small></div><SFChevronRight size="xs" /></button>)}
            {!mapDraft && !searching && !queryTooShort && visibleHits.length === 0 && <p>没有找到结果。换成当地写法常常就有了 —— 比如「成田空港」「Charles de Gaulle」。</p>}
            {!mapDraft && queryTooShort && <div className="search-hints"><button type="button" onClick={() => { setAdding(false); setPickingOnMap(true); }}>从地图选点</button><span>成田国际机场</span><span>京都站</span><span>宫浦港</span><span>Seoul Station</span></div>}
          </div>
        </section>
      </div>}
    </section>
  );
}

function MessagesScreen() {
  const [activeConversation, setActiveConversation] = useState(1);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const active = conversations.find((item) => item.id === activeConversation) ?? conversations[0];

  const send = () => {
    const value = draft.trim();
    if (!value) return;
    setSent((messages) => [...messages, value]);
    setDraft("");
  };

  return (
    <section className={`screen messages-screen ${mobileChatOpen ? "mobile-chat-open" : ""}`}>
      <aside className="conversation-pane">
        <header className="messages-heading"><div><span className="eyebrow">MESSAGES</span><h1>私信</h1></div><button className="icon-button"><SFPlus size="sm" /></button></header>
        <div className="messages-search compact-search"><SFMagnifyingglass size="sm" /><input placeholder="搜索对话" aria-label="搜索私信" /></div>
        <div className="inbox-tabs"><button className="active">全部</button><button>未读</button><button>群组</button></div>
        <div className="conversation-list">
          {conversations.map((conversation) => (
            <button key={conversation.id} className={activeConversation === conversation.id ? "active" : ""} onClick={() => { setActiveConversation(conversation.id); setMobileChatOpen(true); }}>
              <span className="conversation-avatar"><img src={conversation.avatar} alt="" />{conversation.online && <i />}</span>
              <span className="conversation-copy"><strong>{conversation.name}</strong><small>{conversation.preview}</small></span>
              <span className="conversation-meta"><small>{conversation.time}</small>{conversation.unread > 0 && <i>{conversation.unread}</i>}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-pane">
        <header className="chat-header">
          <button className="mobile-back icon-button" onClick={() => setMobileChatOpen(false)}><SFChevronLeft size="sm" /></button>
          <span className="conversation-avatar"><img src={active.avatar} alt="" />{active.online && <i />}</span>
          <div><strong>{active.name}</strong><small>{active.online ? "在线" : "最近在线于昨天"}</small></div>
          <span />
          <button className="icon-button"><SFCameraFill size="sm" /></button>
          <button className="icon-button"><SFInfoCircleFill size="sm" /></button>
        </header>
        <div className="chat-stream">
          <div className="chat-day">今天 10:32</div>
          <div className="message incoming"><p>京都那家旅馆我已经收藏了，庭院真的很好看。</p><small>10:33</small></div>
          <div className="message incoming media-message"><img src={posts[0].image} alt="京都旅馆庭院" /><p>就是这家，在祇园附近。</p><small>10:34</small></div>
          <div className="message outgoing"><p>太好了！我把它加进第三天的行程。</p><small>10:36 · 已读</small></div>
          <div className="shared-trip-card">
            <div className="shared-map"><span>✈︎</span><i /><b /></div>
            <div><small>共享行程</small><strong>日本，秋天</strong><p>9月18日 – 9月25日 · 5个地点</p><button>打开行程 <SFChevronRight size="xs" /></button></div>
          </div>
          <div className="message incoming"><p>那我们晚上一起把餐厅也选好 ✨</p><small>10:42</small></div>
          {sent.map((message, index) => <div className="message outgoing" key={`${message}-${index}`}><p>{message}</p><small>刚刚</small></div>)}
        </div>
        <div className="composer">
          <button className="icon-button"><SFPlus size="sm" /></button>
          <div className="composer-field"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="发消息…" /><button><SFPhotoFill size="sm" /></button><button><SFMicrophoneFill size="sm" /></button></div>
          <button className="send-button" onClick={send}><SFPaperplaneFill size="sm" /></button>
        </div>
      </section>

      <aside className="chat-info-pane">
        <img className="info-avatar" src={active.avatar} alt="" />
        <h2>{active.name}</h2><p>@mika.ontheroad</p>
        <div className="info-actions"><button><SFBell size="sm" /><span>静音</span></button><button><SFMagnifyingglass size="sm" /><span>搜索</span></button><button><SFEllipsis size="sm" /><span>更多</span></button></div>
        <div className="shared-section"><strong>共同旅程</strong><button><div className="mini-cover" style={{ backgroundImage: `url(${posts[0].image})` }} /><span><b>日本，秋天</b><small>3位同行者</small></span><SFChevronRight size="xs" /></button></div>
        <div className="shared-section"><strong>共享媒体</strong><div className="media-grid">{[posts[0].image, posts[1].image, posts[2].image, posts[3].image].map((image) => <img src={image} alt="" key={image} />)}</div></div>
      </aside>
    </section>
  );
}

function ProfileScreen({ onSettings }: { onSettings: () => void }) {
  const [profileTab, setProfileTab] = useState("旅程");
  return (
    <section className="screen profile-screen">
      <header className="screen-header profile-topbar"><div><span className="eyebrow">PROFILE</span><h1>个人主页</h1></div><div className="header-actions"><button className="icon-button"><SFSquareAndArrowUp size="sm" /></button><button className="icon-button" aria-label="打开设置" onClick={onSettings}><SFGearshapeFill size="sm" /></button></div></header>
      <div className="profile-scroll">
        <section className="profile-hero soft-card">
          <div className="profile-cover" style={{ backgroundImage: `url(${posts[5].image})` }}><span>HONG KONG · 2026</span></div>
          <div className="profile-main">
            <img className="profile-avatar" src={posts[5].avatar} alt="Vincent" />
            <div className="profile-intro"><span className="verified-line"><h2>Vincent Lee</h2><SFCheckmarkCircleFill size="sm" /></span><p>@vincent.outside · 香港</p><small>用地图收藏生活。城市漫步、建筑和偶尔起飞的周末。</small></div>
            <div className="profile-buttons"><button className="primary-action">编辑主页</button><button className="icon-button"><SFEllipsis size="sm" /></button></div>
          </div>
          <div className="profile-stats"><div><strong>28</strong><span>旅程</span></div><div><strong>12.4k</strong><span>关注者</span></div><div><strong>386</strong><span>正在关注</span></div><div><strong>17</strong><span>到访国家</span></div></div>
        </section>

        <div className="profile-columns">
          <main className="profile-content">
            <div className="profile-tabs">{["旅程", "照片", "收藏"].map((tab) => <button key={tab} className={profileTab === tab ? "active" : ""} onClick={() => setProfileTab(tab)}>{tab === "旅程" ? <SFMapFill size="sm" /> : tab === "照片" ? <SFRectangleGrid2x2Fill size="sm" /> : <SFBookmarkFill size="sm" />} {tab}</button>)}</div>
            {profileTab === "旅程" && <div className="trip-grid">
              {[
                ["日本，秋天", "8天 · 5个地点", posts[0].image, "正在计划"],
                ["首尔周末", "3天 · 12个地点", posts[4].image, "2026年6月"],
                ["香港落日地图", "18个收藏地点", posts[5].image, "持续更新"],
                ["山梨与富士", "4天 · 7个地点", posts[2].image, "2026年3月"],
              ].map(([title, meta, image, badge]) => <article className="trip-tile" key={title}><img src={image} alt={title} /><span className="trip-badge">{badge}</span><div><h3>{title}</h3><p>{meta}</p></div></article>)}
            </div>}
            {profileTab === "照片" && <div className="photo-profile-grid">{posts.map((post) => <img src={post.image} alt={post.title} key={post.id} />)}</div>}
            {profileTab === "收藏" && <div className="saved-collections"><div><SFBookmarkFill size="xl" /><h3>灵感收藏夹</h3><p>你收藏的路线、地点和旅行故事会出现在这里。</p></div></div>}
          </main>
          <aside className="account-column">
            <section className="travel-summary soft-card"><div className="aside-title"><strong>旅行足迹</strong><button>查看地图</button></div><div className="mini-world-map"><i className="dot dot-one"/><i className="dot dot-two"/><i className="dot dot-three"/><i className="dot dot-four"/></div><div className="summary-numbers"><span><strong>42</strong><small>城市</small></span><span><strong>17</strong><small>国家</small></span><span><strong>86k</strong><small>公里</small></span></div></section>
            <section className="account-card soft-card"><div className="aside-title"><strong>账号管理</strong></div>{[
              [SFPersonCropCircleFill, "个人资料", "头像、简介与用户名"],
              [SFEnvelopeFill, "账号与安全", "邮箱、密码与登录"],
              [SFLockFill, "隐私", "可见范围与定位权限"],
              [SFBell, "通知", "推送与消息偏好"],
              [SFHandRaisedFill, "社区安全", "屏蔽与内容管理"],
            ].map(([Icon, title, subtitle]) => { const ItemIcon = Icon as ElementType; return <button key={title as string}><span><ItemIcon size="sm" /></span><div><strong>{title as string}</strong><small>{subtitle as string}</small></div><SFChevronRight size="xs" /></button>; })}</section>
          </aside>
        </div>
      </div>
    </section>
  );
}

const platformCopy: Record<AppPlatform, { title: string; subtitle: string }> = {
  web: { title: "Web 社交画布", subtitle: "大图信息流、固定操作区、Airbnb / Instagram 式内容密度" },
  ios: { title: "iOS 原生风格", subtitle: "内容层保持清晰，导航与控制层使用 Liquid Glass 和 SF Symbols" },
  android: { title: "Android Material 3", subtitle: "8dp 网格、tonal surface、Material 图标与自适应导航" },
};

function SettingsSheet({ platform, preference, onPreference, onClose }: { platform: AppPlatform; preference: PlatformPreference; onPreference: (value: PlatformPreference) => void; onClose: () => void }) {
  return <div className="settings-backdrop" role="button" tabIndex={0} aria-label="关闭设置" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <section className="settings-sheet frosted-panel" role="dialog" aria-modal="true" aria-label="界面设置">
      <header><div><span className="eyebrow">INTERFACE SYSTEM</span><h2>界面与设备</h2><p>正式安装后会自动使用当前设备的设计系统；网页里也可以预览三端。</p></div><button className="icon-button" aria-label="关闭" onClick={onClose}><SFXmark size="sm" /></button></header>
      <div className="settings-current"><span>{platform === "android" ? <MaterialGlyph name="settings" /> : <SFGearshapeFill size="md" />}</span><div><strong>{platformCopy[platform].title}</strong><small>{platformCopy[platform].subtitle}</small></div></div>
      <div className="platform-choice" role="radiogroup" aria-label="界面预览">
        {(["auto", "web", "ios", "android"] as PlatformPreference[]).map((value) => <button type="button" role="radio" aria-checked={preference === value} className={preference === value ? "active" : ""} key={value} onClick={() => onPreference(value)}><strong>{value === "auto" ? "自动" : value === "web" ? "网页" : value === "ios" ? "iOS" : "Android"}</strong><small>{value === "auto" ? "跟随设备" : value === "web" ? "社交信息流" : value === "ios" ? "Apple HIG" : "Material 3"}</small></button>)}
      </div>
      <div className="settings-notes"><p><strong>交互安全区</strong><span>按钮与底部导航保留独立操作带，不覆盖信息流正文。</span></p><p><strong>地图动画</strong><span>预览速率可 0.1×–2× 无级调节，也可与真实出发和到达时间同步。</span></p></div>
    </section>
  </div>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("community");
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { platform, preference, setPreference } = usePlatformMode();
  const materialName = (id: AppTab): "home" | "explore" | "messages" | "person" => id === "community" ? "home" : id === "explore" ? "explore" : id === "messages" ? "messages" : "person";

  return (
    <main className={`app-shell platform-${platform}`} data-platform={platform}>
      <aside className="desktop-nav frosted-panel">
        <button className="brand-button" aria-label="漫游首页"><span><SFLocationFill size="sm" /></span><strong>漫游</strong></button>
        <nav aria-label="主要导航">
          {navItems.map((item) => {
            const Icon = activeTab === item.id ? item.fill : item.outline;
            return <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}><span>{platform === "android" ? <MaterialGlyph name={materialName(item.id)} /> : <Icon size="md" />}</span><small>{item.label}</small>{item.id === "messages" && <i>7</i>}</button>;
          })}
        </nav>
        <button className="create-button" onClick={() => setCreateOpen(true)}>{platform === "android" ? <MaterialGlyph name="add" /> : <SFPlus size="sm" />}<span>发布</span></button>
        <div className="nav-spacer" />
        <button className="nav-avatar" onClick={() => setActiveTab("profile")}><img src={posts[5].avatar} alt="个人主页" /><span className="online-dot" /></button>
      </aside>

      <section className="app-stage">
        {activeTab === "community" && <CommunityScreen onCreate={() => setCreateOpen(true)} />}
        {activeTab === "explore" && <ExploreScreen />}
        {activeTab === "messages" && <MessagesScreen />}
        {activeTab === "profile" && <ProfileScreen onSettings={() => setSettingsOpen(true)} />}
      </section>

      <header className="mobile-header frosted-panel"><button className="mobile-brand"><SFLocationFill size="sm" /><strong>漫游</strong></button><div><button className="icon-button"><SFMagnifyingglass size="sm" /></button><button className="icon-button notification-button"><SFBell size="sm" /><i>3</i></button></div></header>
      <nav className="mobile-tabbar frosted-panel" aria-label="主要导航">
        {navItems.map((item) => { const Icon = activeTab === item.id ? item.fill : item.outline; return <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}><span>{platform === "android" ? <MaterialGlyph name={materialName(item.id)} /> : <Icon size="md" />}{item.id === "messages" && <i>7</i>}</span><small>{item.label}</small></button>; })}
      </nav>

      {settingsOpen && <SettingsSheet platform={platform} preference={preference} onPreference={setPreference} onClose={() => setSettingsOpen(false)} />}

      {createOpen && <div className="modal-backdrop" role="button" tabIndex={0} aria-label="关闭创建窗口" onClick={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setCreateOpen(false); }}><section className="create-modal frosted-panel" role="dialog" aria-modal="true" aria-label="发布新内容"><button className="modal-close" onClick={() => setCreateOpen(false)}><SFXmark size="sm" /></button><span className="create-icon"><SFCameraFill size="xl" /></span><h2>分享一段旅程</h2><p>发布照片、路线或正在发生的旅行故事。</p><div className="create-options"><button><span><SFPhotoFill size="md" /></span><div><strong>照片与故事</strong><small>分享旅行中的一个瞬间</small></div><SFChevronRight size="xs" /></button><button><span><SFMapFill size="md" /></span><div><strong>路线与行程</strong><small>把地图变成可复制的故事</small></div><SFChevronRight size="xs" /></button><button><span><SFClock size="md" /></span><div><strong>此刻动态</strong><small>24 小时后自动消失</small></div><SFChevronRight size="xs" /></button></div></section></div>}
    </main>
  );
}
