"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CloudSun,
  Compass,
  Copy,
  Ellipsis,
  Footprints,
  Heart,
  Layers3,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Pause,
  Plane,
  Play,
  Plus,
  Route,
  Search,
  Share,
  Ship,
  Sparkles,
  TrainFront,
  Users,
  X,
} from "lucide-react";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoidmluY2VudGxlZTg3NiIsImEiOiJjbXAyZHB5OHowZjh3MndzZHY0ZWs3Z3FsIn0.DC32avSkIOG7VpPwMgetjw";

type Transport = "flight" | "train" | "walk" | "ferry";

type TripStop = {
  id: string;
  day: string;
  shortDate: string;
  date: string;
  time: string;
  city: string;
  region: string;
  place: string;
  transport: Transport;
  transportLabel: string;
  duration: string;
  temperature: number;
  weather: string;
  color: string;
  coordinates: [number, number];
  zoom: number;
};

const stops: TripStop[] = [
  {
    id: "hong-kong",
    day: "第 1 天",
    shortDate: "18",
    date: "9月18日，周五",
    time: "08:45",
    city: "香港",
    region: "中国香港",
    place: "香港国际机场",
    transport: "flight",
    transportLabel: "航班 CX520",
    duration: "4小时15分",
    temperature: 28,
    weather: "晴间多云",
    color: "#007aff",
    coordinates: [114.1694, 22.3193],
    zoom: 10.8,
  },
  {
    id: "tokyo",
    day: "第 2 天",
    shortDate: "19",
    date: "9月19日，周六",
    time: "10:30",
    city: "东京",
    region: "日本",
    place: "涩谷 · 代官山",
    transport: "walk",
    transportLabel: "城市漫步",
    duration: "6.4公里",
    temperature: 23,
    weather: "局部多云",
    color: "#34c759",
    coordinates: [139.7006, 35.6595],
    zoom: 12.8,
  },
  {
    id: "kyoto",
    day: "第 3 天",
    shortDate: "20",
    date: "9月20日，周日",
    time: "09:10",
    city: "京都",
    region: "日本",
    place: "祇园 · 东山",
    transport: "train",
    transportLabel: "东海道新干线",
    duration: "2小时8分",
    temperature: 25,
    weather: "晴朗",
    color: "#af52de",
    coordinates: [135.7785, 35.0037],
    zoom: 12.4,
  },
  {
    id: "naoshima",
    day: "第 4 天",
    shortDate: "21",
    date: "9月21日，周一",
    time: "11:20",
    city: "直岛",
    region: "日本香川县",
    place: "宫浦港 · 本村",
    transport: "ferry",
    transportLabel: "四国汽船",
    duration: "50分钟",
    temperature: 24,
    weather: "海风轻柔",
    color: "#32ade6",
    coordinates: [133.9958, 34.4598],
    zoom: 12.2,
  },
  {
    id: "osaka",
    day: "第 5 天",
    shortDate: "22",
    date: "9月22日，周二",
    time: "13:40",
    city: "大阪",
    region: "日本",
    place: "中之岛 · 梅田",
    transport: "train",
    transportLabel: "JR 濑户大桥线",
    duration: "2小时34分",
    temperature: 26,
    weather: "少云",
    color: "#ff9500",
    coordinates: [135.5023, 34.6937],
    zoom: 12.1,
  },
];

const flightPath: [number, number][] = Array.from({ length: 81 }, (_, index) => {
  const t = index / 80;
  const start = stops[0].coordinates;
  const end = stops[1].coordinates;
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t + Math.sin(Math.PI * t) * 3.7,
  ];
});

const routeGeoJson = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { mode: "flight" },
      geometry: { type: "LineString" as const, coordinates: flightPath },
    },
    {
      type: "Feature" as const,
      properties: { mode: "train" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          stops[1].coordinates,
          [138.6, 35.2],
          [137.2, 35.0],
          stops[2].coordinates,
          stops[4].coordinates,
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { mode: "ferry" },
      geometry: {
        type: "LineString" as const,
        coordinates: [stops[2].coordinates, [134.4, 34.7], stops[3].coordinates, stops[4].coordinates],
      },
    },
  ],
};

const transportIcons = {
  flight: Plane,
  train: TrainFront,
  walk: Footprints,
  ferry: Ship,
};

function MapSurface({
  selectedIndex,
  progress,
  mapMode,
  onSelect,
}: {
  selectedIndex: number;
  progress: number;
  mapMode: "standard" | "satellite";
  onSelect: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const planeMarkerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const [readyVersion, setReadyVersion] = useState(0);

  useEffect(() => {
    let disposed = false;
    let mapInstance: import("mapbox-gl").Map | null = null;

    void import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (disposed || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style:
          mapMode === "satellite"
            ? "mapbox://styles/mapbox/standard-satellite"
            : "mapbox://styles/mapbox/standard",
        center: [131.5, 30.8],
        zoom: 4.55,
        pitch: 48,
        bearing: -11,
        antialias: true,
        attributionControl: true,
        logoPosition: "bottom-right",
      });

      mapRef.current = map;
      mapInstance = map;
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }),
        "top-right",
      );

      map.on("style.load", () => {
        if (disposed) return;
        try {
          map.setConfigProperty("basemap", "lightPreset", mapMode === "satellite" ? "dusk" : "day");
          map.setConfigProperty("basemap", "show3dBuildings", true);
          map.setConfigProperty("basemap", "show3dLandmarks", true);
          map.setConfigProperty("basemap", "showPointOfInterestLabels", true);
          map.setConfigProperty("basemap", "showRoadLabels", true);
        } catch {
          // The standard style keeps sensible defaults if a config key is unavailable.
        }

        if (!map.getSource("trip-routes")) {
          map.addSource("trip-routes", { type: "geojson", data: routeGeoJson });
          map.addLayer({
            id: "flight-route-halo",
            type: "line",
            source: "trip-routes",
            filter: ["==", ["get", "mode"], "flight"],
            paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.78, "line-blur": 2 },
          });
          map.addLayer({
            id: "flight-route",
            type: "line",
            source: "trip-routes",
            filter: ["==", ["get", "mode"], "flight"],
            paint: { "line-color": "#007aff", "line-width": 3, "line-opacity": 0.95, "line-dasharray": [1.2, 1.7] },
          });
          map.addLayer({
            id: "rail-route",
            type: "line",
            source: "trip-routes",
            filter: ["==", ["get", "mode"], "train"],
            paint: { "line-color": "#af52de", "line-width": 3.5, "line-opacity": 0.82 },
          });
          map.addLayer({
            id: "ferry-route",
            type: "line",
            source: "trip-routes",
            filter: ["==", ["get", "mode"], "ferry"],
            paint: { "line-color": "#32ade6", "line-width": 3, "line-opacity": 0.8, "line-dasharray": [0.7, 1.5] },
          });
        }

        stops.forEach((stop, index) => {
          const marker = document.createElement("button");
          marker.className = "map-pin";
          marker.dataset.stop = String(index);
          marker.setAttribute("aria-label", `${stop.city}，${stop.place}`);
          marker.style.setProperty("--pin-color", stop.color);
          const number = document.createElement("span");
          number.textContent = String(index + 1);
          marker.append(number);
          marker.addEventListener("click", () => onSelect(index));
          new mapboxgl.Marker({ element: marker, anchor: "bottom" })
            .setLngLat(stop.coordinates)
            .addTo(map);
        });

        const planeElement = document.createElement("div");
        planeElement.className = "vehicle-marker";
        planeElement.textContent = "✈︎";
        planeMarkerRef.current = new mapboxgl.Marker({ element: planeElement })
          .setLngLat(flightPath[Math.round((progress / 100) * (flightPath.length - 1))])
          .addTo(map);

        setReadyVersion((version) => version + 1);
      });
    });

    return () => {
      disposed = true;
      planeMarkerRef.current = null;
      mapRef.current = null;
      mapInstance?.remove();
    };
  }, [mapMode, onSelect]);

  useEffect(() => {
    const pointIndex = Math.min(
      flightPath.length - 1,
      Math.max(0, Math.round((progress / 100) * (flightPath.length - 1))),
    );
    planeMarkerRef.current?.setLngLat(flightPath[pointIndex]);
  }, [progress, readyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyVersion) return;
    const stop = stops[selectedIndex];
    map.flyTo({
      center: stop.coordinates,
      zoom: stop.zoom,
      pitch: 58,
      bearing: selectedIndex === 0 ? -18 : selectedIndex === 1 ? -24 : -8,
      duration: 1400,
      essential: true,
      padding: { left: window.innerWidth > 820 ? 360 : 0, top: 80, right: 0, bottom: window.innerWidth > 820 ? 0 : 260 },
    });
    containerRef.current?.querySelectorAll<HTMLElement>(".map-pin").forEach((pin) => {
      pin.classList.toggle("active", pin.dataset.stop === String(selectedIndex));
    });
  }, [selectedIndex, readyVersion]);

  return <div ref={containerRef} className="map-surface" aria-label="真实旅行路线地图" />;
}

export default function Home() {
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(48);
  const [mapMode, setMapMode] = useState<"standard" | "satellite">("standard");
  const [planTab, setPlanTab] = useState<"行程" | "指南" | "收藏">("行程");
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("行程");

  const selected = stops[selectedIndex];
  const SelectedTransportIcon = transportIcons[selected.transport];

  const selectStop = useMemo(
    () => (index: number) => {
      setSelectedIndex(index);
      setSheetExpanded(false);
    },
    [],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + 0.32));
    }, 36);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // The confirmation state is enough for this visual prototype.
    }
    setCopied(true);
  };

  return (
    <main className="app">
      <MapSurface
        selectedIndex={selectedIndex}
        progress={progress}
        mapMode={mapMode}
        onSelect={selectStop}
      />

      <aside className={`sidebar surface ${sheetExpanded ? "expanded" : ""}`}>
        <button
          className="sheet-handle"
          aria-label={sheetExpanded ? "收起行程" : "展开行程"}
          onClick={() => setSheetExpanded((expanded) => !expanded)}
        />

        <div className="window-toolbar">
          <div className="app-identity">
            <span className="app-symbol"><Navigation size={15} strokeWidth={2.4} /></span>
            <strong>漫游</strong>
          </div>
          <div className="toolbar-actions">
            <button aria-label="同行者"><Users size={17} /></button>
            <button aria-label="更多"><Ellipsis size={18} /></button>
          </div>
        </div>

        <div className="desktop-search search-field">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 140)}
            placeholder="搜索地点、行程或指南"
            aria-label="搜索地点、行程或指南"
          />
          {query && <button onClick={() => setQuery("")} aria-label="清除搜索"><X size={13} /></button>}
          {searchOpen && (
            <div className="search-suggestions">
              <span className="suggestion-heading">建议</span>
              {["东京塔", "京都站", "直岛 · 地中美术馆"].map((item, index) => (
                <button key={item} onMouseDown={() => { setQuery(item); setSelectedIndex(Math.min(index + 1, 3)); }}>
                  <span><MapPin size={15} /></span><strong>{item}</strong><ChevronRight size={14} />
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="trip-heading">
          <div className="trip-kicker"><Sparkles size={13} /> 共同旅行</div>
          <h1>日本，秋天</h1>
          <p>9月18日 – 9月25日 · 8天</p>
          <div className="trip-meta">
            <span><MapPin size={13} /> 5 个地点</span>
            <span><Users size={13} /> 3 位同行者</span>
          </div>
        </section>

        <div className="scope-control" role="tablist" aria-label="行程内容">
          {(["行程", "指南", "收藏"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={planTab === tab}
              className={planTab === tab ? "selected" : ""}
              onClick={() => setPlanTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {planTab === "行程" ? (
          <div className="itinerary" role="list">
            {stops.map((stop, index) => {
              const Icon = transportIcons[stop.transport];
              return (
                <button
                  key={stop.id}
                  className={`stop-row ${selectedIndex === index ? "selected" : ""}`}
                  onClick={() => selectStop(index)}
                  role="listitem"
                >
                  <span className="date-column"><small>9月</small><strong>{stop.shortDate}</strong></span>
                  <span className="route-column">
                    <i style={{ background: stop.color }}><Icon size={15} /></i>
                    {index < stops.length - 1 && <b />}
                  </span>
                  <span className="stop-copy">
                    <small>{stop.day} · {stop.time}</small>
                    <strong>{stop.city}</strong>
                    <span>{stop.place}</span>
                    <em>{stop.transportLabel} · {stop.duration}</em>
                  </span>
                  <span className="stop-weather"><CloudSun size={17} /><strong>{stop.temperature}°</strong></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            {planTab === "指南" ? <Compass size={31} /> : <Bookmark size={31} />}
            <strong>{planTab === "指南" ? "为这次旅行添加指南" : "还没有收藏地点"}</strong>
            <p>{planTab === "指南" ? "把餐厅、展览和灵感整理在一起。" : "收藏的地点会出现在这里。"}</p>
            <button><Plus size={15} /> 添加</button>
          </div>
        )}

        <div className="sidebar-footer">
          <button><Plus size={17} /> 添加地点</button>
          <button aria-label="路线设置"><Route size={17} /></button>
        </div>
      </aside>

      <div className="mobile-search search-field glass">
        <Search size={17} />
        <input placeholder="搜索地点或地址" aria-label="搜索地点或地址" />
        <button aria-label="个人资料"><CircleUserRound size={22} /></button>
      </div>

      <div className="weather-pill glass">
        <CloudSun size={17} />
        <span><strong>{selected.city}</strong> {selected.temperature}°</span>
        <i>{selected.weather}</i>
      </div>

      <div className="map-toolbar toolbar-glass">
        <div className="map-style-control">
          <button className={mapMode === "standard" ? "active" : ""} onClick={() => setMapMode("standard")}>
            地图
          </button>
          <button className={mapMode === "satellite" ? "active" : ""} onClick={() => setMapMode("satellite")}>
            卫星
          </button>
        </div>
        <span className="toolbar-separator" />
        <button aria-label="定位"><LocateFixed size={18} /></button>
        <button aria-label="图层" onClick={() => setMapMode((mode) => mode === "standard" ? "satellite" : "standard")}><Layers3 size={18} /></button>
        <span className="toolbar-separator" />
        <button aria-label="分享" onClick={() => setShareOpen(true)}><Share size={18} /></button>
        <button aria-label="更多"><Ellipsis size={19} /></button>
      </div>

      <section className="place-card surface" aria-live="polite">
        <div className="place-topline">
          <span>{selected.day} · {selected.date}</span>
          <button aria-label="收藏地点"><Heart size={18} /></button>
        </div>
        <div className="place-title-row">
          <div>
            <h2>{selected.city}</h2>
            <p>{selected.place} · {selected.region}</p>
          </div>
          <div className="temperature"><CloudSun size={22} /><strong>{selected.temperature}°</strong></div>
        </div>
        <div className="place-actions">
          <button className="primary"><Navigation size={16} /> 路线</button>
          <button><SelectedTransportIcon size={16} /> {selected.transportLabel}</button>
          <button aria-label="更多地点操作"><Ellipsis size={17} /></button>
        </div>
      </section>

      <section className="playback toolbar-glass" aria-label="路线播放">
        <button className="play" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "暂停" : "播放"}>
          {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </button>
        <div className="playback-info">
          <div><strong>香港</strong><Plane size={12} /><strong>东京</strong><span>4小时15分</span></div>
          <div
            className="timeline"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setProgress(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)));
            }}
          >
            <i style={{ width: `${progress}%` }} />
            <b style={{ left: `${progress}%` }} />
          </div>
        </div>
        <button className="detail-chevron" aria-label="查看航班详情"><ChevronRight size={18} /></button>
      </section>

      <nav className="mobile-tabbar glass" aria-label="主要导航">
        {[
          ["地图", MapIcon],
          ["行程", Route],
          ["发现", Compass],
          ["我的", CircleUserRound],
        ].map(([label, Icon]) => {
          const TabIcon = Icon as typeof MapIcon;
          return (
            <button key={label as string} className={mobileTab === label ? "active" : ""} onClick={() => setMobileTab(label as string)}>
              <TabIcon size={20} /><small>{label as string}</small>
            </button>
          );
        })}
      </nav>

      {shareOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setShareOpen(false)}>
          <section className="share-sheet surface" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close-sheet" onClick={() => setShareOpen(false)} aria-label="关闭"><X size={17} /></button>
            <span className="share-icon"><Share size={23} /></span>
            <h2 id="share-title">分享“日本，秋天”</h2>
            <p>任何拥有链接的人都可以查看这份行程。</p>
            <div className="share-preview-card">
              <div><Plane size={19} /></div>
              <span><strong>日本，秋天</strong><small>8天 · 5个地点 · 3位同行者</small></span>
            </div>
            <button className="sheet-action" onClick={copyLink}>
              <span>{copied ? <Check size={17} /> : <Copy size={17} />}</span>
              <strong>{copied ? "链接已复制" : "复制链接"}</strong>
              <ChevronRight size={16} />
            </button>
            <button className="sheet-action">
              <span><Plus size={18} /></span><strong>复制为我的行程</strong><ChevronRight size={16} />
            </button>
          </section>
        </div>
      )}

      <div className="demo-label"><Clock3 size={12} /> UI 原型 · 路线与天气为演示数据</div>
    </main>
  );
}
