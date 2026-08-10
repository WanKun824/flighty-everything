"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
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
import SFGlobeAsiaAustraliaFill from "sf-symbols-lib/monochrome/SFGlobeAsiaAustraliaFill";
import SFCompassDrawing from "sf-symbols-lib/monochrome/SFCompassDrawing";
import SFRectangleGrid2x2Fill from "sf-symbols-lib/monochrome/SFRectangleGrid2x2Fill";
import SFListBullet from "sf-symbols-lib/monochrome/SFListBullet";
import SFAt from "sf-symbols-lib/monochrome/SFAt";
import SFLink from "sf-symbols-lib/monochrome/SFLink";
import SFEnvelopeFill from "sf-symbols-lib/monochrome/SFEnvelopeFill";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import SFLockFill from "sf-symbols-lib/monochrome/SFLockFill";
import SFHandRaisedFill from "sf-symbols-lib/monochrome/SFHandRaisedFill";
import SFInfoCircleFill from "sf-symbols-lib/monochrome/SFInfoCircleFill";
import SFChartBarFill from "sf-symbols-lib/monochrome/SFChartBarFill";
import SFCalendar from "sf-symbols-lib/monochrome/SFCalendar";
import SFLocationNorthFill from "sf-symbols-lib/monochrome/SFLocationNorthFill";
import SFCloudSunFill from "sf-symbols-lib/monochrome/SFCloudSunFill";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

type AppTab = "community" | "explore" | "messages" | "profile";
type Transport = "flight" | "train" | "ferry";

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
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=90",
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
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=90",
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
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=90",
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
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=160&q=90",
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
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=90",
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
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=90",
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
  ["你的故事", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&q=90"],
  ["Mika", posts[0].avatar],
  ["Noah", posts[1].avatar],
  ["Aya", posts[2].avatar],
  ["Jun", posts[3].avatar],
  ["Sora", posts[4].avatar],
  ["Yuki", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=90"],
] as const;

const tripStops = [
  { city: "香港", detail: "赤鱲角国际机场", time: "9月18日 · 08:45", type: "flight" as Transport, color: "#0a84ff", coordinate: [114.1694, 22.3193] as [number, number] },
  { city: "东京", detail: "涩谷 · 代官山", time: "9月19日 · 10:30", type: "train" as Transport, color: "#bf5af2", coordinate: [139.7006, 35.6595] as [number, number] },
  { city: "京都", detail: "祇园 · 东山", time: "9月20日 · 09:10", type: "train" as Transport, color: "#ff9f0a", coordinate: [135.7785, 35.0037] as [number, number] },
  { city: "直岛", detail: "宫浦港 · 本村", time: "9月21日 · 11:20", type: "ferry" as Transport, color: "#32ade6", coordinate: [133.9958, 34.4598] as [number, number] },
];

const conversations = [
  { id: 1, name: "Mika Chen", avatar: posts[0].avatar, preview: "京都那家旅馆我已经收藏了", time: "2分钟", unread: 2, online: true },
  { id: 2, name: "关西秋日小组", avatar: posts[2].image, preview: "Noah 分享了一条新路线", time: "18分钟", unread: 5, online: false },
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
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=90" alt="Vincent" />
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

function MapCanvas({ progress, selected, mapStyle, onSelect }: { progress: number; selected: number; mapStyle: "standard" | "satellite"; onSelect: (index: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const planeRef = useRef<import("mapbox-gl").Marker | null>(null);
  const ferryRef = useRef<import("mapbox-gl").Marker | null>(null);
  const [ready, setReady] = useState(0);

  const flightPath = useMemo(() => Array.from({ length: 101 }, (_, index) => {
    const t = index / 100;
    const from = tripStops[0].coordinate;
    const to = tripStops[1].coordinate;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + Math.sin(Math.PI * t) * 3.7] as [number, number];
  }), []);
  const ferryPath = useMemo(() => Array.from({ length: 51 }, (_, index) => {
    const t = index / 50;
    const from: [number, number] = [134.15, 34.5];
    const to = tripStops[3].coordinate;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as [number, number];
  }), []);

  useEffect(() => {
    let disposed = false;
    let instance: import("mapbox-gl").Map | null = null;
    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapStyle === "standard" ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/standard-satellite",
        center: [131.8, 30.6], zoom: 4.5, pitch: 48, bearing: -10, antialias: true, attributionControl: true,
      });
      mapRef.current = map;
      instance = map;
      map.on("style.load", () => {
        try {
          map.setConfigProperty("basemap", "lightPreset", mapStyle === "standard" ? "day" : "dusk");
          map.setConfigProperty("basemap", "show3dBuildings", true);
          map.setConfigProperty("basemap", "show3dLandmarks", true);
        } catch { /* Standard style defaults remain active. */ }

        const routeData = {
          type: "FeatureCollection" as const,
          features: [
            { type: "Feature" as const, properties: { mode: "flight" }, geometry: { type: "LineString" as const, coordinates: flightPath } },
            { type: "Feature" as const, properties: { mode: "rail" }, geometry: { type: "LineString" as const, coordinates: [tripStops[1].coordinate, [138.4, 35.15], [137.1, 35.0], tripStops[2].coordinate, [134.15, 34.5]] } },
            { type: "Feature" as const, properties: { mode: "ferry" }, geometry: { type: "LineString" as const, coordinates: ferryPath } },
          ],
        };
        map.addSource("journey", { type: "geojson", data: routeData });
        map.addLayer({ id: "route-halo", type: "line", source: "journey", paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": .78, "line-blur": 1.5 } });
        map.addLayer({ id: "route-flight", type: "line", source: "journey", filter: ["==", ["get", "mode"], "flight"], paint: { "line-color": "#0a84ff", "line-width": 3.2, "line-dasharray": [1, 1.4] } });
        map.addLayer({ id: "route-rail", type: "line", source: "journey", filter: ["==", ["get", "mode"], "rail"], paint: { "line-color": "#bf5af2", "line-width": 3.2 } });
        map.addLayer({ id: "route-ferry", type: "line", source: "journey", filter: ["==", ["get", "mode"], "ferry"], paint: { "line-color": "#32ade6", "line-width": 3.2, "line-dasharray": [.6, 1.2] } });

        tripStops.forEach((stop, index) => {
          const el = document.createElement("button");
          el.className = "route-pin";
          el.dataset.index = String(index);
          el.style.setProperty("--pin", stop.color);
          el.textContent = String(index + 1);
          el.setAttribute("aria-label", stop.city);
          el.addEventListener("click", () => onSelect(index));
          new mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat(stop.coordinate).addTo(map);
        });
        const plane = document.createElement("div");
        plane.className = "moving-vehicle plane";
        plane.textContent = "✈︎";
        planeRef.current = new mapboxgl.Marker({ element: plane }).setLngLat(flightPath[Math.round(progress)]).addTo(map);
        const ferry = document.createElement("div");
        ferry.className = "moving-vehicle ferry";
        ferry.textContent = "⛴︎";
        ferryRef.current = new mapboxgl.Marker({ element: ferry }).setLngLat(ferryPath[Math.round(progress / 2)]).addTo(map);
        setReady((value) => value + 1);
      });
    });
    return () => { disposed = true; planeRef.current = null; ferryRef.current = null; mapRef.current = null; instance?.remove(); };
  }, [mapStyle, flightPath, ferryPath, onSelect]);

  useEffect(() => {
    planeRef.current?.setLngLat(flightPath[Math.min(100, Math.round(progress))]);
    ferryRef.current?.setLngLat(ferryPath[Math.min(50, Math.round(progress / 2))]);
  }, [progress, ready, flightPath, ferryPath]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const stop = tripStops[selected];
    map.flyTo({ center: stop.coordinate, zoom: selected === 0 ? 10.6 : 12.2, pitch: 58, bearing: -16, duration: 1200, essential: true, padding: { left: window.innerWidth > 900 ? 390 : 0, bottom: window.innerWidth <= 900 ? 280 : 0 } });
    containerRef.current?.querySelectorAll<HTMLElement>(".route-pin").forEach((pin) => pin.classList.toggle("active", pin.dataset.index === String(selected)));
  }, [selected, ready]);

  return <div className="map-canvas" ref={containerRef} />;
}

function ExploreScreen() {
  const [selectedStop, setSelectedStop] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(38);
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");
  const [editing, setEditing] = useState(false);
  const selectStop = useCallback((index: number) => setSelectedStop(index), []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setProgress((value) => value >= 100 ? 0 : value + .28), 34);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const selected = tripStops[selectedStop];
  return (
    <section className="screen explore-screen">
      <MapCanvas progress={progress} selected={selectedStop} mapStyle={mapStyle} onSelect={selectStop} />
      <header className="map-topbar frosted-panel">
        <div className="map-search"><SFMagnifyingglass size="sm" /><input placeholder="搜索地点或添加目的地" aria-label="搜索地图" /></div>
        <div className="map-mode"><button className={mapStyle === "standard" ? "active" : ""} onClick={() => setMapStyle("standard")}>地图</button><button className={mapStyle === "satellite" ? "active" : ""} onClick={() => setMapStyle("satellite")}>卫星</button></div>
        <button className="icon-button" aria-label="定位"><SFLocationNorthFill size="sm" /></button>
        <button className="icon-button" aria-label="分享"><SFSquareAndArrowUp size="sm" /></button>
      </header>

      <aside className="route-builder frosted-panel">
        <span className="mobile-grabber" />
        <div className="builder-heading">
          <div><span className="eyebrow">YOUR JOURNEY</span><h1>日本，秋天</h1><p>9月18日 – 9月25日 · 8天</p></div>
          <button onClick={() => setEditing(!editing)}>{editing ? "完成" : "编辑"}</button>
        </div>
        <div className="trip-people"><span className="mini-avatars"><img src={posts[5].avatar} alt=""/><img src={posts[0].avatar} alt=""/><img src={posts[1].avatar} alt=""/></span><strong>3 位同行者</strong><button><SFPlus size="xs" /></button></div>
        <div className="transport-palette">
          <button className="active"><SFAirplane size="sm" /><span>飞机</span></button>
          <button><SFTrainSideFrontCar size="sm" /><span>火车</span></button>
          <button><SFFerryFill size="sm" /><span>轮船</span></button>
        </div>
        <div className="route-list">
          {tripStops.map((stop, index) => {
            const Icon = stop.type === "flight" ? SFAirplane : stop.type === "ferry" ? SFFerryFill : SFTrainSideFrontCar;
            return (
              <button key={stop.city} className={selectedStop === index ? "selected" : ""} onClick={() => setSelectedStop(index)}>
                <span className="route-node" style={{ background: stop.color }}><Icon size="xs" /></span>
                <span className="route-copy"><small>{stop.time}</small><strong>{stop.city}</strong><em>{stop.detail}</em></span>
                <span className="route-weather">{[28, 23, 25, 24][index]}°<small>{index === 3 ? "海风" : "晴"}</small></span>
                {editing && <span className="drag-handle">≡</span>}
              </button>
            );
          })}
          <button className="add-stop"><span><SFPlus size="xs" /></span><strong>添加一个地点</strong></button>
        </div>
      </aside>

      <div className="map-weather frosted-panel"><span><SFCloudSunFill size="sm" /></span><div><strong>{selected.city} 23°</strong><small>局部多云 · 降水 10%</small></div></div>
      <div className="route-player frosted-panel">
        <button className="player-button" onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? <SFPauseFill size="sm" /> : <SFPlayFill size="sm" />}</button>
        <div><span><strong>香港</strong><SFAirplane size="xs" /><strong>东京</strong><small>4小时15分</small></span><div className="route-progress" onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setProgress(((event.clientX - rect.left) / rect.width) * 100); }}><i style={{ width: `${progress}%` }} /><b style={{ left: `${progress}%` }} /></div></div>
        <button className="icon-button"><SFChevronRight size="xs" /></button>
      </div>
      <div className="map-fab-stack"><button className="icon-button frosted-panel"><SFLocationNorthFill size="sm" /></button><button className="icon-button frosted-panel"><SFGlobeAsiaAustraliaFill size="sm" /></button></div>
    </section>
  );
}

function SFCloudSunFillIcon() {
  return <span className="weather-glyph">☀︎</span>;
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

function ProfileScreen() {
  const [profileTab, setProfileTab] = useState("旅程");
  return (
    <section className="screen profile-screen">
      <header className="screen-header profile-topbar"><div><span className="eyebrow">PROFILE</span><h1>个人主页</h1></div><div className="header-actions"><button className="icon-button"><SFSquareAndArrowUp size="sm" /></button><button className="icon-button"><SFGearshapeFill size="sm" /></button></div></header>
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("community");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="app-shell">
      <aside className="desktop-nav frosted-panel">
        <button className="brand-button" aria-label="漫游首页"><span><SFLocationFill size="sm" /></span><strong>漫游</strong></button>
        <nav aria-label="主要导航">
          {navItems.map((item) => {
            const Icon = activeTab === item.id ? item.fill : item.outline;
            return <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}><span><Icon size="md" /></span><small>{item.label}</small>{item.id === "messages" && <i>7</i>}</button>;
          })}
        </nav>
        <button className="create-button" onClick={() => setCreateOpen(true)}><SFPlus size="sm" /><span>发布</span></button>
        <div className="nav-spacer" />
        <button className="nav-avatar" onClick={() => setActiveTab("profile")}><img src={posts[5].avatar} alt="个人主页" /><span className="online-dot" /></button>
      </aside>

      <section className="app-stage">
        {activeTab === "community" && <CommunityScreen onCreate={() => setCreateOpen(true)} />}
        {activeTab === "explore" && <ExploreScreen />}
        {activeTab === "messages" && <MessagesScreen />}
        {activeTab === "profile" && <ProfileScreen />}
      </section>

      <header className="mobile-header frosted-panel"><button className="mobile-brand"><SFLocationFill size="sm" /><strong>漫游</strong></button><div><button className="icon-button"><SFMagnifyingglass size="sm" /></button><button className="icon-button notification-button"><SFBell size="sm" /><i>3</i></button></div></header>
      <nav className="mobile-tabbar frosted-panel" aria-label="主要导航">
        {navItems.map((item) => { const Icon = activeTab === item.id ? item.fill : item.outline; return <button key={item.id} className={activeTab === item.id ? "active" : ""} onClick={() => setActiveTab(item.id)}><span><Icon size="md" />{item.id === "messages" && <i>7</i>}</span><small>{item.label}</small></button>; })}
      </nav>

      {createOpen && <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}><section className="create-modal frosted-panel" role="dialog" aria-modal="true" aria-label="发布新内容" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)}><SFXmark size="sm" /></button><span className="create-icon"><SFCameraFill size="xl" /></span><h2>分享一段旅程</h2><p>发布照片、路线或正在发生的旅行故事。</p><div className="create-options"><button><span><SFPhotoFill size="md" /></span><div><strong>照片与故事</strong><small>分享旅行中的一个瞬间</small></div><SFChevronRight size="xs" /></button><button><span><SFMapFill size="md" /></span><div><strong>路线与行程</strong><small>把地图变成可复制的故事</small></div><SFChevronRight size="xs" /></button><button><span><SFClock size="md" /></span><div><strong>此刻动态</strong><small>24 小时后自动消失</small></div><SFChevronRight size="xs" /></button></div></section></div>}
    </main>
  );
}
