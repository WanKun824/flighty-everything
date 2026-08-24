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
import SFGaugeOpen from "sf-symbols-lib/monochrome/SFGaugeOpen";
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
import DebugPanel from "./DebugPanel";
import JourneyPanel from "./JourneyPanel";
import { usePlatformMode, type AppPlatform, type PlatformPreference } from "./platform";
import { routeRuleFor } from "./routeRules";
import { liveJourneyStatus, parseJourneyWindow, timelineProgressAt, type JourneyClockMode } from "./timeSync";
import {
  minQueryLength, queryLanguage, queryVariants, rankHits, stopKindOf, type PlaceHit,
} from "./placeSearch";
import { type Transport, type TripStop } from "./trip";
import { useTripStore } from "./tripStorage";
import { debugEnabled, riderScaleFor, useTuning, zoomRateFor, type SpeedCurve, type VehicleTuning } from "./tuning";
import type { VehicleKind, VehicleView } from "./Vehicle3D";
import {
  RAIL_NOTE, locate, sampleAt, useJourneyClock, useJourneyPaths,
  type LegPath, type Timeline,
} from "./routeGeometry";

const LazyVehicle3D = lazy(() => import("./Vehicle3D"));

function VehiclePreview(props: { kind: VehicleKind; progress?: number; className?: string; heading?: number; rate?: number; view?: VehicleView }) {
  return <Suspense fallback={<div className={`${props.className ?? ""} vehicle-loading`} aria-hidden="true" />}><LazyVehicle3D {...props} /></Suspense>;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

type AppTab = "community" | "explore" | "messages" | "profile";

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

/**
 * 国旗图源。Windows 没有旗帜 emoji 字体，区域指示符会被画成两个字母，
 * 所以只能用位图。flagcdn 是 public domain 的 SVG/PNG 旗帜集，和现有的
 * Unsplash 图一样是外链热引；离线或 CDN 不通时会退回序号版本的标记。
 */
const flagUrl = (country: string, width: 40 | 80 | 160) => `https://flagcdn.com/w${width}/${country.toLowerCase()}.png`;

/**
 * 标记点的尺寸（CSS px）。旗面 38×30，下面 10px 是尖脚，尖端落在站点坐标上。
 * 旗面比高要宽，比例贴近国旗本身的 4:3，cover 裁切才不会把竖三色旗裁成一块纯色。
 * `scale` 是画进 sprite 的倍率，交回给 Mapbox 当 pixelRatio —— 地图放大或俯仰时旗面还是清的。
 */
const PIN = { width: 38, height: 38, plate: 30, radius: 9, border: 2.4, scale: 3 };

/** 国旗位图按国家码缓存。canvas 要读像素，必须走 CORS 取图（flagcdn 回 `access-control-allow-origin: *`）。 */
const flagBitmaps = new Map<string, Promise<HTMLImageElement | null>>();
function flagBitmap(country: string) {
  const key = country.toLowerCase();
  let pending = flagBitmaps.get(key);
  if (!pending) {
    pending = new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      // 离线、CDN 不通、国家码不是有效两位码都落到这里，标记就留在序号版本上。
      image.onerror = () => resolve(null);
      image.src = flagUrl(key, 160);
    });
    flagBitmaps.set(key, pending);
  }
  return pending;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * 把一枚标记画成位图，交给 `map.addImage` 进地图自己的 sprite。
 *
 * 标记因此是 symbol 图层画出来的地图符号，不是浮在画布上方的一层 DOM：它跟着缩放变大变小、
 * 被地球背面遮住、和地名标注一起排序，地图俯仰旋转时也始终钉在那个坐标上。
 * 拿不到国旗（没有国家码 / CDN 不通）时旗面换成纯色 + 居中序号，尺寸完全一致，
 * 所以国旗到货后可以直接 `updateImage` 换掉（Mapbox 要求前后尺寸相同）。
 */
function drawPin(color: string, label: string, flag: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = PIN.width * PIN.scale;
  canvas.height = PIN.height * PIN.scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(PIN.scale, PIN.scale);
  const center = PIN.width / 2;

  // 白色外形：圆角牌 + 尖脚合成一条路径，一次 fill —— 分两次画的话重叠处的投影会加深一倍。
  // 尖脚整片留白、不再往里套一层站点色：这个尺寸下彩色尖脚会被读成吊在牌子下面的另一个箭头，
  // 站点色由旗面（没国旗时）、角标和地面上的 stop-anchor 交代。
  ctx.save();
  ctx.shadowColor = "rgba(30,42,50,.34)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2.5;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  roundRectPath(ctx, 0, 0, PIN.width, PIN.plate, PIN.radius);
  ctx.moveTo(center - 6.2, PIN.plate - 3);
  ctx.lineTo(center, PIN.height);
  ctx.lineTo(center + 6.2, PIN.plate - 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const faceWidth = PIN.width - PIN.border * 2;
  const faceHeight = PIN.plate - PIN.border * 2;
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, PIN.border, PIN.border, faceWidth, faceHeight, PIN.radius - PIN.border);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(PIN.border, PIN.border, faceWidth, faceHeight);
  if (flag) {
    // cover：按长边铺满再居中裁，旗面不会被拉扁。
    const fit = Math.max(faceWidth / flag.width, faceHeight / flag.height);
    const width = flag.width * fit;
    const height = flag.height * fit;
    ctx.drawImage(flag, PIN.border + (faceWidth - width) / 2, PIN.border + (faceHeight - height) / 2, width, height);
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (flag) {
    // 国旗占了旗面，第几站这个信息挪到角标上，不能因为换了国旗就丢掉。
    // 角标用站点色实底 + 白描边：白底白牌子会糊在一起，实色圆同时把站点色带了回来。
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(29.9, 7.9, 7.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(29.9, 7.9, 6.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
    ctx.fillText(label, 29.9, 8.4);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText(label, center, PIN.plate / 2 + .5);
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * 从命中的地图要素里取回站点序号。
 *
 * mapbox-gl 的 `GeoJSONFeature` 继承自 `@types/geojson` 的 `Feature`，而那个包没装 ——
 * `skipLibCheck` 把 d.ts 里那处未解析的继承吞掉了，于是 `properties` 在类型上根本看不见。
 * 只为这一处类型缺口装一个 @types 不值得，就地把自己写进 properties 的 index 取回来。
 */
function pinIndex(feature: unknown) {
  const value = (feature as { properties?: { index?: unknown } } | undefined)?.properties?.index;
  return typeof value === "number" ? value : null;
}

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
 * 传进来的 cut 必须是 sampleAt 给的 lineProgress（墨卡托刻度），不是弧长进度：
 * line-progress 本身按投影长度归一，喂弧长会让边缘和载具错开最多 1.6%。
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

/**
 * 航向低通的收敛速率（1/秒）。越小越平滑，代价是车头在弯里滞后。
 *
 * 模拟一条 4km、10m 一个顶点的 S 形公路（逐段 bearing 噪声 σ≈10.8°/顶点）量出来的：
 * 8/s 配 Vehicle3D 的 turn 14 时偏航角加速度峰值 59.6 rad/s²，5/s 配 turn 9 降到 28.7 —— 少一半；
 * 相对理想中心线的跟随滞后 p95 只从 3.40° 涨到 3.61°，看不出来。
 * 顺带一提，不滤波直接用 raw 的滞后反而更差（p95 6.96°）：那时候车头是在追噪声。
 *
 * 实拍复核对上了这个预测：同一段 22km 公路各跑两轮，页面内挂 rAF 采样器读车身主轴角
 * （取 7 秒窗口、重采样到均匀 60Hz 再差分），8/s+14 是偏航角速度峰值 388/360°/s、
 * 角加速度 RMS 1372/1572°/s²，5/s+9 降到 189/185°/s 和 681/783°/s² —— 同样正好减半。
 */
const HEADING_SMOOTH = 5;

/**
 * 缩放 → 载具屏幕尺寸系数已参数化到 ./tuning.ts 的 riderScaleFor 与 TUNING_DEFAULTS，
 * 调试面板里可实时调，生产构建不渲染面板。默认值是每种载具各一份（见 TUNING_DEFAULTS），
 * 量化到 0.05 一档（与 Vehicle3D 的 ResizeObserver 配合）。
 */

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
  /** 用户设定的倍速。这里只用来让载具自身的动作跟上播放节奏。 */
  speed: number;
  /** 缩放折算出来的倍率的低频快照，只用于渲染。每帧的真值在 zoomRateRef 里。 */
  zoomFactor: number;
  /** 缩放折算出来的倍率，由地图写、时钟读。见 routeGeometry.zoomRate。 */
  zoomRateRef: { current: number };
  /** 每种载具各自的基准宽度 + 尺寸随缩放收窄曲线 + 模型速度倍率（调试面板可调）。 */
  riderTuning: Record<Transport, VehicleTuning>;
  /** 速度随缩放折算的曲线，调试面板可调。 */
  speedCurve: SpeedCurve;
  /** 当前载具的模型速度倍率，由地图写、时钟读。 */
  vehicleSpeedRef: { current: number };
  onSelect: (index: number) => void;
  onSeek: (t: number) => void;
  onFollowBreak: () => void;
  onMapPoint: (coordinate: [number, number]) => void;
  onZoomRate: (rate: number) => void;
};

function MapCanvas({ stops, paths, timeline, progressRef, selected, mapStyle, globe, follow, picking, speed, zoomFactor, zoomRateRef, riderTuning, speedCurve, vehicleSpeedRef, onSelect, onSeek, onFollowBreak, onMapPoint, onZoomRate }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const riderRef = useRef<import("mapbox-gl").Marker | null>(null);
  const [riderHost, setRiderHost] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  // 载具的种类和航向以低频 state 传给 Vehicle3D：Three 内部对航向做插值，
  // 所以喂粗一点的输入也能转得平滑，省下每帧一次的 React 重渲染。
  const [rider, setRider] = useState<{ kind: Transport; heading: number }>({ kind: "flight", heading: 90 });

  // rAF 循环和地图事件要读这些值，但不能因为它们变化就重建，所以镜像到 ref。
  const live = useRef({ paths, timeline, follow, picking, zoomRateRef, onSelect, onSeek, onFollowBreak, onMapPoint, onZoomRate });
  useEffect(() => { live.current = { paths, timeline, follow, picking, zoomRateRef, onSelect, onSeek, onFollowBreak, onMapPoint, onZoomRate }; }, [paths, timeline, follow, picking, zoomRateRef, onSelect, onSeek, onFollowBreak, onMapPoint, onZoomRate]);

  // 调参值同样镜像进 ref：syncZoom 和缩放事件都读它，但调参变化不应重建地图。
  const tuningRef = useRef({ riderTuning, speedCurve });
  useEffect(() => { tuningRef.current = { riderTuning, speedCurve }; }, [riderTuning, speedCurve]);

  // 当前在地图上的载具种类。syncZoom 定义在只跑一次的地图初始化 effect 里，得走 ref 读它。
  const riderKindRef = useRef<Transport>(rider.kind);
  useEffect(() => { riderKindRef.current = rider.kind; }, [rider.kind]);

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

        // 站点标记整套都活在地图里，一个 source 供三层：贴地的光斑和落点是两个 circle
        // （`circle-pitch-alignment: map` 让它们跟着俯仰旋转一起变形，是真的印在地面上），
        // 标记本体是 symbol 图层，图标就是 sprite 里那枚国旗牌。这是地图自己的收藏点画法 ——
        // 换成 DOM marker 就成了浮在画布上方的一层，遮挡、排序、地球背面裁剪全都对不上。
        map.addSource("journey-stops", { type: "geojson", data: empty });
        map.addLayer({ id: "stop-ground", type: "circle", source: "journey-stops", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 10, 11, 16, 20], "circle-color": ["get", "color"], "circle-opacity": .18, "circle-blur": .55, "circle-pitch-alignment": "map", "circle-pitch-scale": "map" } });
        map.addLayer({ id: "stop-anchor", type: "circle", source: "journey-stops", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.6, 10, 3.2, 16, 5], "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.2, "circle-pitch-alignment": "map", "circle-pitch-scale": "map" } });
        map.addLayer({
          id: "stop-pin",
          type: "symbol",
          source: "journey-stops",
          layout: {
            "icon-image": ["get", "icon"],
            // 尖端压在坐标上；allow-overlap 保证六个站点挨得再近也不会被 Mapbox 的避让规则藏掉。
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            // 选中的那枚放大 1.16 倍。zoom 只能待在 interpolate 的最外层，所以倍率乘不到外面，
            // 只能把两种尺寸写进每个 zoom 档的输出里。
            "icon-size": ["interpolate", ["linear"], ["zoom"],
              2, ["case", ["get", "selected"], .84, .72],
              8, ["case", ["get", "selected"], 1.02, .88],
              14, ["case", ["get", "selected"], 1.16, 1],
            ],
            // sort-key 大的后画、压在上面：先按行程顺序叠，选中的那枚再抬到最上层。
            "symbol-sort-key": ["+", ["get", "index"], ["case", ["get", "selected"], 100, 0]],
          },
        });

        const host = document.createElement("div");
        host.className = "map-rider";
        riderRef.current = new mapboxgl.Marker({ element: host, pitchAlignment: "viewport", rotationAlignment: "viewport" })
          .setLngLat(stops[0]?.coordinate ?? [0, 0])
          .addTo(map);
        setRiderHost(host);
        setReady(true);
      });

      /** 标记点挡在线上面：命中它的那一击归标记，不再顺带 seek 或落新点。 */
      const pinAt = (point: import("mapbox-gl").Point) =>
        map.getLayer("stop-pin") ? map.queryRenderedFeatures(point, { layers: ["stop-pin"] }) : [];

      map.on("click", "stop-pin", (event) => {
        const index = pinIndex(event.features?.[0]);
        if (index !== null) live.current.onSelect(index);
      });
      map.on("mouseenter", "stop-pin", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "stop-pin", () => { map.getCanvas().style.cursor = live.current.picking ? "crosshair" : ""; });

      // 点线上任意位置即跳到那一刻，行程线本身也是可交互的控件。
      map.on("click", ROUTE_LAYERS, (event) => {
        if (pinAt(event.point).length) return;
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
        if (pinAt(event.point).length) return;
        const layers = ROUTE_LAYERS.filter((layer) => Boolean(map.getLayer(layer)));
        if (layers.length && map.queryRenderedFeatures(event.point, { layers }).length) return;
        live.current.onMapPoint([event.lngLat.lng, event.lngLat.lat]);
      });
      map.on("mouseenter", ROUTE_LAYERS, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", ROUTE_LAYERS, () => { map.getCanvas().style.cursor = live.current.picking ? "crosshair" : ""; });
      // 用户一开始拖地图就把跟随交还给他，像导航软件那样。
      map.on("dragstart", () => { if (live.current.follow) live.current.onFollowBreak(); });

      // 缩放 → 速率。ref 每次事件都写（时钟每帧读它），state 只在变化超过 4% 时才通报，
      // 否则一次 flyTo 就会连着推上百次 setState。
      let published = 0;
      let publishedScale = 1;
      const syncZoom = () => {
        const zoom = map.getZoom();
        const rate = zoomRateFor(zoom, tuningRef.current.speedCurve);
        live.current.zoomRateRef.current = rate;
        if (Math.abs(rate - published) > published * .04) {
          published = rate;
          live.current.onZoomRate(rate);
        }
        // 缩放 → 载具屏幕尺寸。写在 marker 的宿主元素上，不经过 React。
        const scale = riderScaleFor(zoom, tuningRef.current.riderTuning[riderKindRef.current].curve);
        if (scale !== publishedScale) {
          publishedScale = scale;
          riderRef.current?.getElement().style.setProperty("--rider-zoom", String(scale));
        }
      };
      map.on("zoom", syncZoom);
      syncZoom();
    });
    return () => {
      disposed = true;
      riderRef.current = null;
      mapRef.current = null;
      instance?.remove();
    };
    // 底图常量、首站坐标只用于初始化，不需要重建地图。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 载具尺寸随「当前载具种类」和它的调参走：换载具或调参时重写 --rider-w 与 --rider-zoom。
  useEffect(() => {
    const element = riderRef.current?.getElement();
    const map = mapRef.current;
    if (!element || !map || !ready) return;
    const vehicle = riderTuning[rider.kind];
    element.style.setProperty("--rider-w", `${vehicle.baseW}px`);
    element.style.setProperty("--rider-zoom", String(riderScaleFor(map.getZoom(), vehicle.curve)));
  }, [rider.kind, riderTuning, ready]);

  // 当前载具的模型速度倍率：时钟每帧读这个 ref，这里随载具/调参变化刷新。
  useEffect(() => {
    vehicleSpeedRef.current = riderTuning[rider.kind].speed;
  }, [rider.kind, riderTuning, vehicleSpeedRef]);

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

  // 站点标记：图标进 sprite，位置和选中态进 source。整体换掉比逐个 diff 更不容易出错，
  // 六个点的 setData 也就是几百字节。
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    const features = stops.map((stop, index) => {
      const label = String(index + 1);
      // 图标按内容取名：同一个国家、同一个颜色、同一个序号只画一次，换行程也能复用。
      const icon = `pin:${label}:${stop.color}:${stop.country?.toLowerCase() ?? "-"}`;
      if (!map.hasImage(icon)) {
        // 先挂上纯色 + 序号的版本，标记立刻就在地图上；国旗到货再原尺寸换掉。
        const placeholder = drawPin(stop.color, label, null);
        if (placeholder) map.addImage(icon, placeholder, { pixelRatio: PIN.scale });
        if (stop.country) {
          void flagBitmap(stop.country).then((flag) => {
            if (cancelled || !flag || !map.hasImage(icon)) return;
            const painted = drawPin(stop.color, label, flag);
            if (painted) map.updateImage(icon, painted);
          });
        }
      }
      return {
        type: "Feature" as const,
        id: index,
        properties: { color: stop.color, index, icon, selected: index === selected },
        geometry: { type: "Point" as const, coordinates: stop.coordinate },
      };
    });
    (map.getSource("journey-stops") as import("mapbox-gl").GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    // 改颜色、改国家、删站点都会换出新的图标名。先换数据再回收，图层就不会引用到已经删掉的图。
    const used = new Set(features.map((feature) => feature.properties.icon));
    for (const id of map.listImages()) {
      if (id.startsWith("pin:") && !used.has(id)) map.removeImage(id);
    }
    return () => { cancelled = true; };
  }, [stops, selected, ready]);

  // 逐帧驱动载具：位置命令式写进 marker，不经过 React，所以是真正的 60fps。
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    let publishedKind: Transport | null = null;
    let publishedHeading = 0;
    let publishedLeg = -1;
    let publishedPaths: LegPath[] | null = null;
    let centerLon = 0;
    let centerLat = 0;
    let centerPrimed = false;
    let smoothHeading: number | null = null;
    let previous = 0;

    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      // 切走标签页再回来时 now 会跳一大截，截断避免航向滤波一帧收敛完。
      const delta = previous ? Math.min(.05, (now - previous) / 1000) : 0;
      previous = now;
      const map = mapRef.current;
      const { paths: livePaths, timeline: liveTimeline } = live.current;
      if (!map || !livePaths.length) return;
      const { legIndex, legProgress } = locate(liveTimeline, progressRef.current);
      const path = livePaths[Math.min(legIndex, livePaths.length - 1)];
      if (!path) return;
      // 位置、航向、轨迹刻度出自同一次采样，轨迹边缘才会严格咬在载具身上。
      const { coordinate, bearing, lineProgress } = sampleAt(path, legProgress);
      riderRef.current?.setLngLat(coordinate);

      // 屏幕航向 = 真实方位角 - 地图旋转角，地图转的时候机头才不会跟着歪。
      const screenHeading = (bearing - map.getBearing() + 360) % 360;
      // sampleAt 的 bearing 是逐段常量，而 driving 路线的顶点密到几米一个 —— 过一个顶点跳一次，
      // 原始信号是一串带噪的台阶。先按帧间隔指数低通再比阈值：阈值只负责少推 setState，
      // 滤噪交给滤波。反过来靠 4° 大阈值滤噪的话，载具就会按整数度数一格一格「弹」着转，
      // Vehicle3D 又把每帧的收敛速度当转向角速度去算侧倾，于是每弹一下车身跟着侧一下。
      if (smoothHeading === null || delta === 0) smoothHeading = screenHeading;
      else {
        const toward = ((screenHeading - smoothHeading + 540) % 360) - 180;
        smoothHeading = (smoothHeading + toward * (1 - Math.exp(-delta * HEADING_SMOOTH)) + 360) % 360;
      }
      const turned = Math.abs(((smoothHeading - publishedHeading + 540) % 360) - 180);
      if (path.mode !== publishedKind || turned > 2) {
        publishedKind = path.mode;
        publishedHeading = smoothHeading;
        setRider({ kind: path.mode, heading: smoothHeading });
      }

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
      // 每帧都更。原来是隔帧更（省一半重绘），但那样轨迹边缘只有 30Hz，
      // 载具是 60Hz —— 边缘会周期性地落后半帧，快段上看得出来在「追」。
      // 一次 setPaintProperty 只是换一张 256px 的渐变纹理，顶点不重传，这点开销换得值。
      map.setPaintProperty("route-trail", "line-gradient", trailGradient(lineProgress));

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
    // 选中态本身画在标记上，由上面那个 effect 随 source 数据一起送过去。
    map.flyTo({ center: stop.coordinate, zoom: globe ? 4.6 : stop.kind === "airport" ? 10.6 : 12.2, pitch: globe ? 24 : 58, bearing: -16, duration: 1200, essential: true, padding: cameraPadding(map) });
  }, [selected, ready, globe, stops]);

  return (
    <div className={`map-canvas ${picking ? "is-picking" : ""}`} ref={containerRef}>
      {riderHost && createPortal(
        // view="map" 让屏幕上方正对场景 +Y，heading 就是屏幕方位角本身；
        // rate 只传「用户倍速 × 缩放折算」。模型速度倍率只作用于行程进度（时钟），
        // 不再叠进姿态频率 —— 否则汽车/火车 2~2.5× 会把起伏/俯仰抬到 3Hz 上下，读成「在抖」。
        <VehiclePreview kind={rider.kind} heading={rider.heading} rate={speed * zoomFactor} view="map" className="rider-model" />,
        riderHost,
      )}
    </div>
  );
}

const SPEED_MIN = .1;
const SPEED_MAX = 5;
/** 方向键的步长。滑块本身是无级的（step="any"），键盘这条得自己接，见那里的注释。 */
const SPEED_KEY_STEP = .05;
const clampSpeed = (value: number) => Math.min(SPEED_MAX, Math.max(SPEED_MIN, value));
/** 1× 显示成「1×」而不是「1.00×」，0.85 才显示两位。界面上不再显示这个数，只进 title 和读屏。 */
const speedLabel = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, "")}×`;

type SuggestRow = { mapbox_id: string; name: string; full_address?: string; place_formatted?: string; feature_type?: string; poi_category?: string[] };
/** Geocoding v6 和 Search Box 的国家码都挂在 context.country 上，字段名一致。 */
type PlaceContext = { country?: { country_code?: string } };
type GeocodeRow = {
  id?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; place_formatted?: string; full_address?: string; feature_type?: string; context?: PlaceContext; coordinates?: { longitude: number; latitude: number } };
};

/** 搜索一次要发好几个请求，逐个写 try/catch 太吵；HTTP 错误在这儿就变成异常，由调用方统一兜。 */
async function fetchJson(url: URL, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`${response.status} ${url.pathname}`);
  return response.json();
}

/** 只认两位字母的 alpha-2 —— 拿去拼旗帜 URL 的，别的形式一律当没有。 */
const countryOf = (context?: PlaceContext) => {
  const code = context?.country?.country_code;
  return code && /^[A-Za-z]{2}$/.test(code) ? code.toLowerCase() : undefined;
};

/**
 * 反查坐标所在国家，只为标记点上那面国旗。
 *
 * 检索结果本身大多带 context.country，能带就带、省一次请求；带不到时才走这里。
 * 失败一律返回 undefined —— 标记点退回显示序号，不影响站点本身成立。
 */
async function resolveCountry(coordinate: [number, number]): Promise<string | undefined> {
  try {
    const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
    url.searchParams.set("longitude", String(coordinate[0]));
    url.searchParams.set("latitude", String(coordinate[1]));
    url.searchParams.set("access_token", MAPBOX_TOKEN);
    const data = await fetchJson(url) as { features?: GeocodeRow[] };
    return countryOf(data.features?.[0]?.properties?.context);
  } catch {
    return undefined;
  }
}

export function ExploreScreen() {
  const { stops, setStops, savedTrips, saveTrip, loadTrip, deleteTrip, resetTrip } = useTripStore();
  const { tuning, setTuning, resetTuning, saveAsDefault } = useTuning();
  const [selectedStop, setSelectedStop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [follow, setFollow] = useState(true);
  const [immersive, setImmersive] = useState(false);
  const [pickingOnMap, setPickingOnMap] = useState(false);
  const [mapDraft, setMapDraft] = useState<{ coordinate: [number, number]; name: string; address: string; country?: string } | null>(null);
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
  const [panelHidden, setPanelHidden] = useState(false);
  const [transport, setTransport] = useState<Transport>("flight");
  // 调试面板与行程库的局部状态。
  const [debugOpen, setDebugOpen] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [tripName, setTripName] = useState("");
  const [query, setQuery] = useState("");
  const [departureTime, setDepartureTime] = useState("2026-09-24T09:30");
  const [suggestions, setSuggestions] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionToken = useRef("");
  const selectStop = useCallback((index: number) => setSelectedStop(index), []);

  // 缩放对播放速率的折算。地图每帧写 ref、时钟每帧读 ref，state 只是给界面读数用的低频快照。
  const zoomRateRef = useRef(1);
  const [zoomFactor, setZoomFactor] = useState(1);
  // 当前载具的模型速度倍率。由 MapCanvas 按「现在跑的是哪辆车」写进 ref，时钟每帧读。
  const vehicleSpeedRef = useRef(1);

  // 真实线形：飞机轮船走大圆，汽车火车拉 Mapbox 路网，取不到就退回大圆。
  const { paths, timeline, pendingRoads } = useJourneyPaths(stops, MAPBOX_TOKEN);
  const { progressRef, progress, seek } = useJourneyClock(isPlaying, speed, zoomRateRef, vehicleSpeedRef, tuning.playbackSeconds);
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

  /** 关掉添加面板。草稿一起清掉，否则下次打开还会看到上一回没提交的那个地图选点。 */
  const closeAdding = useCallback(() => {
    setAdding(false);
    setMapDraft(null);
  }, []);

  const commitStop = useCallback((place: { name: string; address: string; coordinate: [number, number]; categories?: string[]; featureType?: string; country?: string }) => {
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
      country: place.country,
      photo: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=500&q=84",
    };
    setStops((current) => {
      setSelectedStop(current.length);
      return [...current, nextStop];
    });
    // 检索结果没带国家码时补一次反查。站点先落地、旗子后到 ——
    // 加站不该被一次网络请求卡住，标记点在这期间显示序号。
    if (!place.country) {
      void resolveCountry(place.coordinate).then((country) => {
        if (!country) return;
        setStops((current) => current.map((stop) => stop.id === nextStop.id ? { ...stop, country } : stop));
      });
    }
    setAdding(false);
    setMapDraft(null);
    setQuery("");
    setSuggestions([]);
    sessionToken.current = globalThis.crypto?.randomUUID?.() ?? "manyou-search-session";
  }, [departureTime, transport, setStops]);

  const addSuggestion = async (hit: PlaceHit) => {
    setSearching(true);
    try {
      let coordinate = hit.coordinate;
      let name = hit.name;
      let address = hit.address;
      let categories = hit.categories;
      let country: string | undefined;
      // Search Box 的 suggestion 只有 id，坐标要再换一次；Geocoding 的已经带坐标了。
      if (!coordinate) {
        const url = new URL(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(hit.id.replace(/^poi:/, ""))}`);
        url.searchParams.set("session_token", sessionToken.current || "manyou-search-session");
        url.searchParams.set("language", queryLanguage(hit.name));
        url.searchParams.set("access_token", MAPBOX_TOKEN);
        const data = await fetchJson(url) as { features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; full_address?: string; place_formatted?: string; feature_type?: string; poi_category?: string[]; context?: PlaceContext } }> };
        const feature = data.features?.[0];
        coordinate = feature?.geometry?.coordinates;
        name = feature?.properties?.name ?? name;
        address = feature?.properties?.full_address ?? feature?.properties?.place_formatted ?? address;
        categories = feature?.properties?.poi_category ?? categories;
        // retrieve 顺手就带了国家，能省掉 commitStop 里那次反查。
        country = countryOf(feature?.properties?.context);
      }
      if (!coordinate) return;
      commitStop({ name, address, coordinate, categories, featureType: hit.featureType, country });
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
    let country: string | undefined;
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
      // 这一次反查已经把国家带回来了，标记点的国旗不用再发第二次请求。
      country = countryOf(feature?.context);
    } catch { /* Coordinates still form a valid stop when reverse geocoding is unavailable. */ }
    setMapDraft({ coordinate, name, address, country });
    setSearching(false);
  }, []);

  const selected = stops[selectedStop] ?? stops[0];
  const segmentCount = Math.max(1, paths.length);
  const { legIndex: activeSegmentIndex } = locate(timeline, progress);
  const activePath = paths[activeSegmentIndex];
  const activeTransport = activePath?.mode ?? stops[0]?.type ?? "flight";
  const activeFrom = stops[activeSegmentIndex] ?? stops[0];
  const activeTo = stops[activeSegmentIndex + 1] ?? stops[1] ?? stops[0];
  // 缩放折算偏离 1 超过 8% 才提，免得静止在基准缩放上还挂个「×1.00」。
  const zoomHint = Math.abs(zoomFactor - 1) > .08
    ? `（缩放折算 ×${zoomFactor.toFixed(2)}，实际 ${speedLabel(speed * zoomFactor)}）`
    : "";
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

  // ---- 行程库：保存当前行程为命名记录、载入、删除、恢复示例 ----
  const openTripSave = () => {
    setTripName(stops.length > 1 ? `${stops[0].city} → ${stops[stops.length - 1].city}` : (stops[0]?.city ?? "行程"));
    setSavingTrip(true);
  };
  const confirmTripSave = () => {
    saveTrip(tripName);
    setSavingTrip(false);
    setTripName("");
  };
  const loadSavedTrip = (id: string) => {
    loadTrip(id);
    setSelectedStop(0);
    seek(0);
  };
  const restoreSampleTrip = () => {
    resetTrip();
    setSelectedStop(0);
    seek(0);
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
      // Escape 关添加面板。这条要放在下面那个「输入框里不接快捷键」的早退之前 ——
      // 面板一打开焦点通常就在搜索框或日期框里，早退掉就按不动了。
      if (event.key === "Escape" && adding) { closeAdding(); return; }
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
      else if (event.key === "i" || event.key === "I") {
        setImmersive((value) => {
          if (!value) setPanelHidden(true);
          return !value;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, clockMode, closeAdding, stepLeg]);

  return (
    <section className={`screen explore-screen journey-globe-screen ${immersive ? "is-immersive" : ""}`}>
      <MapCanvas
        stops={stops} paths={paths} timeline={timeline} progressRef={progressRef}
        selected={selectedStop} mapStyle={mapStyle} globe={globe} follow={follow} picking={pickingOnMap}
        speed={speed} zoomFactor={zoomFactor} zoomRateRef={zoomRateRef}
        riderTuning={tuning.vehicles} speedCurve={tuning.speedCurve} vehicleSpeedRef={vehicleSpeedRef}
        onSelect={selectStop} onSeek={seek} onFollowBreak={() => setFollow(false)} onMapPoint={selectMapPoint}
        onZoomRate={setZoomFactor}
      />
      <header className="globe-bar frosted-panel">
        <button type="button" className="map-immersive-button" aria-label="Enter immersive journey view" title="Immersive view (I)" onClick={() => { setImmersive(true); setPanelHidden(true); }}><span>Immersive</span></button>
        {/* 全站只有这一个搜索框，添加面板挂在它下面。聚焦就展开面板，
            打过的字直接就是 query —— 不再有第二个输入框，也不用把字倒过去。 */}
        <div className="globe-search"><SFMagnifyingglass size="sm" /><input value={query} placeholder="搜索机场、车站、港口或景点" aria-label="搜索地图" onFocus={() => setAdding(true)} onChange={(event) => { setQuery(event.target.value); setAdding(true); }} />{searching && <i />}</div>
        <button type="button" className={`map-pick-button ${pickingOnMap ? "on" : ""}`} aria-pressed={pickingOnMap} onClick={() => setPickingOnMap((value) => !value)}><SFPlus size="xs" /><span>{pickingOnMap ? "点地图" : "地图选点"}</span></button>
        <button type="button" className={`icon-button ${follow ? "on" : ""}`} aria-pressed={follow} aria-label="镜头跟随载具（F）" title="镜头跟随载具（F）" onClick={() => setFollow(!follow)}><SFLocationNorthFill size="sm" /></button>
        {debugEnabled && <button type="button" className={`icon-button ${debugOpen ? "on" : ""}`} aria-pressed={debugOpen} aria-label="调试模块" title="模型与速度调试" onClick={() => setDebugOpen((value) => !value)}><SFGaugeOpen size="sm" /></button>}
        <button type="button" className="immersive-button" aria-label="进入沉浸模式" title="沉浸模式（I）" onClick={() => { setImmersive(true); setPanelHidden(true); }}><span>沉浸</span></button>
        <button className="icon-button" aria-label="分享行程"><SFSquareAndArrowUp size="sm" /></button>
      </header>

      {immersive && <button type="button" className="immersive-exit" onClick={() => { setImmersive(false); setPanelHidden(false); }}>退出沉浸 <span>I</span></button>}

      {/* 调试模块只在开发环境（或 ?debug=1）渲染，生产构建不出现。 */}
      {debugEnabled && debugOpen && <DebugPanel tuning={tuning} onChange={setTuning} onReset={resetTuning} onSaveDefault={saveAsDefault} onClose={() => setDebugOpen(false)} />}

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
              界面上不写数字 —— 拖到哪就是哪，指针位置本身就是读数；具体倍速和缩放折算
              留在 title 与 aria-valuetext 里，给鼠标悬停和读屏用。双击整格回到 1×，比拖回去准。 */}
          <label
            className={`player-speed ${clockMode === "live" ? "disabled" : ""}`}
            title={clockMode === "live" ? "真实时间模式由行程时间决定速率" : `播放速度 ${speedLabel(speed)}${zoomHint}，双击回到 1×`}
            onDoubleClick={() => { if (clockMode !== "live") setSpeed(1); }}
          >
            <SFGaugeOpen size="xs" />
            <input
              // step="any"：真正的无级，不再吸附到 0.01 的格子上。
              type="range" min={SPEED_MIN} max={SPEED_MAX} step="any" value={speed} disabled={clockMode === "live"}
              aria-label="播放速度" aria-valuetext={`${speedLabel(speed)}速${zoomHint}`}
              onChange={(event) => setSpeed(Number(event.target.value))}
              onKeyDown={(event) => {
                if (!event.key.startsWith("Arrow")) return;
                // 不拦的话左右键会冒到窗口那层去切换行程段落，滑块就调不动了。
                event.stopPropagation();
                // step="any" 之后方向键的步长由浏览器自己定（各家不一样，有的直接按 1 跳），
                // 所以键盘这条自己接：一下 0.05，并且收敛到两位小数，不让浮点误差攒出 0.8700000001。
                const move = event.key === "ArrowRight" || event.key === "ArrowUp" ? SPEED_KEY_STEP
                  : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -SPEED_KEY_STEP : 0;
                if (!move) return;
                event.preventDefault();
                setSpeed((value) => Number(clampSpeed(value + move).toFixed(2)));
              }}
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

          {panel === "route" && <div className="trip-library">
            <div className="trip-library-head">
              <strong>行程库</strong>
              {!savingTrip && <button type="button" onClick={openTripSave}><SFBookmarkFill size="xs" /> 保存当前</button>}
            </div>
            {savingTrip && <div className="trip-save-form">
              <input value={tripName} onChange={(event) => setTripName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") confirmTripSave(); if (event.key === "Escape") setSavingTrip(false); }} placeholder="行程名称" aria-label="行程名称" />
              <button type="button" className="trip-save-confirm" onClick={confirmTripSave}>保存</button>
              <button type="button" className="trip-save-cancel" onClick={() => setSavingTrip(false)}>取消</button>
            </div>}
            {savedTrips.length === 0 && !savingTrip && <p className="trip-library-empty">还没有保存的行程。编辑好行程后点「保存当前」，刷新也不会丢。</p>}
            {savedTrips.map((trip) => <div className="trip-row" key={trip.id}>
              <button type="button" className="trip-load" onClick={() => loadSavedTrip(trip.id)}><span><strong>{trip.name}</strong><small>{trip.stops.length}站 · {new Date(trip.savedAt).toLocaleDateString("zh-CN")}</small></span></button>
              <button type="button" className="trip-delete" aria-label={`删除 ${trip.name}`} onClick={() => deleteTrip(trip.id)}><SFXmark size="xs" /></button>
            </div>)}
            <button type="button" className="trip-restore" onClick={restoreSampleTrip}>恢复示例行程</button>
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

      {/* 添加地点不再是模态弹层：没有遮罩、不夺焦点，就挂在顶栏搜索框正下方，
          地图始终能拖、能缩、能点站点。搜索框也只留顶栏那一个 —— 原来弹层里还有第二个，
          两个输入框抢同一个 query，才需要 value={adding ? "" : query} 那种绕法。
          「地图选点」于是也不用先把这块关掉：点完地图，草稿卡就落在下面的结果列里。 */}
      {/* Escape 关面板挂在窗口那层的快捷键 effect 里，不挂在这里：
          焦点可能落在搜索框、日期框或结果列表上，只有窗口层能一处覆盖全部。 */}
      {adding && <section className="add-place-sheet frosted-panel" aria-label="添加行程地点">
        <header><div><h2>添加行程地点</h2><p>{pickingOnMap ? "现在点地图上任意一处" : "在上面搜索，或点「地图选点」直接落点"}</p></div><button className="icon-button" aria-label="关闭添加地点" onClick={closeAdding}><SFXmark size="sm" /></button></header>
        <div className="add-form-row"><label><span>出发时间</span><input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} /></label><label><span>交通工具</span><select value={transport} onChange={(event) => setTransport(event.target.value as Transport)}>{(Object.keys(transportMeta) as Transport[]).map((type) => <option key={type} value={type}>{transportMeta[type].label}</option>)}</select></label></div>
        {/* 这四个格子原来各挂一个 3D 模型：一个下拉面板里同时跑四个 WebGL 上下文，
            纯粹是为了选交通方式。图标够用了，真模型在「载具」标签页里。 */}
        <div className="vehicle-picker">{(Object.keys(transportMeta) as Transport[]).map((type) => <button key={type} type="button" className={transport === type ? "active" : ""} onClick={() => setTransport(type)}>{transportIcon(type)}<span>{transportMeta[type].label}</span></button>)}</div>
        <div className="suggestion-list">
          {mapDraft && <article className="map-draft-card"><span><SFLocationFill size="sm" /></span><div><strong>{mapDraft.name}</strong><small>{mapDraft.address}</small><small>{mapDraft.coordinate[1].toFixed(5)}, {mapDraft.coordinate[0].toFixed(5)}</small></div><button type="button" onClick={() => commitStop(mapDraft)}>添加到行程</button></article>}
          {visibleHits.map((hit) => <button key={hit.id} onClick={() => void addSuggestion(hit)}><span>{stopIcon(stopKindOf(hit.featureType, hit.categories, hit.name))}</span><div><strong>{hit.name}</strong><small>{hit.address || kindLabel(stopKindOf(hit.featureType, hit.categories, hit.name))}</small></div><SFChevronRight size="xs" /></button>)}
          {!mapDraft && !searching && !queryTooShort && visibleHits.length === 0 && <p>没有找到结果。换成当地写法常常就有了 —— 比如「成田空港」「Charles de Gaulle」。</p>}
          {!mapDraft && queryTooShort && <div className="search-hints"><button type="button" onClick={() => setPickingOnMap(true)}>从地图选点</button><span>成田国际机场</span><span>京都站</span><span>宫浦港</span><span>Seoul Station</span></div>}
        </div>
      </section>}
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
