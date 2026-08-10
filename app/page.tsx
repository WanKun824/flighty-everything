"use client";

import { useEffect, useMemo, useState } from "react";

type TripStop = {
  id: string;
  day: string;
  date: string;
  city: string;
  area: string;
  time: string;
  transport: string;
  symbol: string;
  temperature: number;
  condition: string;
  summary: string;
  color: string;
};

const stops: TripStop[] = [
  {
    id: "hong-kong",
    day: "第 1 天",
    date: "9月18日 · 周五",
    city: "香港",
    area: "赤鱲角国际机场",
    time: "08:45",
    transport: "飞机 · 4小时15分",
    symbol: "✈︎",
    temperature: 28,
    condition: "晴间多云",
    summary: "从维港出发，搭乘早班航班前往东京。建议提前 2 小时抵达机场。",
    color: "#0a84ff",
  },
  {
    id: "tokyo",
    day: "第 2 天",
    date: "9月19日 · 周六",
    city: "东京",
    area: "涩谷 · 代官山",
    time: "10:30",
    transport: "步行 · 6.4公里",
    symbol: "figure.walk",
    temperature: 23,
    condition: "局部多云",
    summary: "上午从涩谷十字路口开始，沿旧山手通前往代官山，傍晚在目黑川散步。",
    color: "#30d158",
  },
  {
    id: "kyoto",
    day: "第 3 天",
    date: "9月20日 · 周日",
    city: "京都",
    area: "祇园 · 东山",
    time: "09:10",
    transport: "新干线 · 2小时8分",
    symbol: "tram.fill",
    temperature: 25,
    condition: "晴朗",
    summary: "乘新干线抵达京都，步行穿过花见小路，在日落前到达清水寺观景台。",
    color: "#bf5af2",
  },
  {
    id: "naoshima",
    day: "第 4 天",
    date: "9月21日 · 周一",
    city: "直岛",
    area: "宫浦港 · 本村",
    time: "11:20",
    transport: "渡轮 · 50分钟",
    symbol: "ferry.fill",
    temperature: 24,
    condition: "微风",
    summary: "从宇野港搭乘渡轮前往直岛。下午游览地中美术馆，夜宿本村。",
    color: "#64d2ff",
  },
];

const navItems = [
  ["探索", "safari.fill"],
  ["行程", "map.fill"],
  ["新建", "plus"],
  ["社区", "person.2.fill"],
] as const;

const symbolFallbacks: Record<string, string> = {
  "safari.fill": "⌾",
  "map.fill": "⌘",
  plus: "+",
  "person.2.fill": "◎",
  "figure.walk": "↟",
  "tram.fill": "▰",
  "ferry.fill": "≈",
};

export default function Home() {
  const [selectedId, setSelectedId] = useState("tokyo");
  const [activeNav, setActiveNav] = useState("行程");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(42);
  const [mapMode, setMapMode] = useState<"地图" | "卫星">("地图");
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const selected = useMemo(
    () => stops.find((stop) => stop.id === selectedId) ?? stops[1],
    [selectedId],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 100 ? 0 : current + 0.45));
    }, 40);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!shareOpen) setCopied(false);
  }, [shareOpen]);

  const planeLeft = 20 + progress * 0.6;
  const planeTop = 50 - Math.sin((progress / 100) * Math.PI) * 22;

  return (
    <main className={`app-shell ${mapMode === "卫星" ? "satellite" : "standard"}`}>
      <section className="map-canvas" aria-label="香港至日本旅行地图演示">
        <div className="map-atmosphere" />
        <div className="ocean-grid" />
        <div className="land land-china" />
        <div className="land land-taiwan" />
        <div className="land land-japan" />
        <div className="land land-korea" />
        <div className="map-road road-one" />
        <div className="map-road road-two" />
        <div className="map-road road-three" />
        <div className="city city-hong-kong">
          <span className="city-dot origin" />
          <strong>香港</strong>
          <small>HONG KONG</small>
        </div>
        <div className="city city-tokyo">
          <span className="city-dot destination" />
          <strong>东京</strong>
          <small>TOKYO</small>
        </div>
        <div className="city city-taipei"><span />台北</div>
        <div className="city city-osaka"><span />大阪</div>
        <div className="city city-kyoto"><span />京都</div>
        <div className="route-arc route-shadow" />
        <div className="route-arc route-main" />
        <div
          className={`moving-plane ${isPlaying ? "flying" : ""}`}
          style={{ left: `${planeLeft}%`, top: `${planeTop}%` }}
          aria-hidden="true"
        >
          ✈︎
        </div>
        <div className="flight-chip" aria-hidden="true">
          <span>HKG</span><i /> <span>HND</span>
        </div>
        <div className="map-caption">概念地图 · UI 演示数据</div>
      </section>

      <header className="top-bar glass-control">
        <button className="circle-control sidebar-toggle" aria-label="显示或隐藏边栏">
          <span className="sidebar-symbol" />
        </button>
        <div className="brand-lockup">
          <span className="brand-mark"><i /></span>
          <span><strong>漫游</strong><small>TRAVEL STORIES</small></span>
        </div>
        <div className="trip-title">
          <strong>秋日关西</strong>
          <span>香港 → 东京 → 京都</span>
        </div>
        <div className="top-actions">
          <div className="segmented map-switch" role="group" aria-label="地图显示方式">
            {(["地图", "卫星"] as const).map((mode) => (
              <button
                key={mode}
                className={mapMode === mode ? "selected" : ""}
                onClick={() => setMapMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <button className="circle-control" aria-label="分享行程" onClick={() => setShareOpen((open) => !open)}>
            <span className="share-symbol">↑</span>
          </button>
          <button className="circle-control more-symbol" aria-label="更多选项">•••</button>
          <button className="avatar-button" aria-label="个人资料">V</button>
        </div>
      </header>

      <nav className="app-nav glass-control" aria-label="主要导航">
        {navItems.map(([label, icon]) => (
          <button
            key={label}
            className={activeNav === label ? "active" : ""}
            onClick={() => setActiveNav(label)}
            aria-current={activeNav === label ? "page" : undefined}
          >
            <span aria-hidden="true">{symbolFallbacks[icon]}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>

      <aside className={`itinerary-panel standard-material ${sheetExpanded ? "expanded" : ""}`}>
        <button
          className="sheet-grabber"
          aria-label={sheetExpanded ? "收起行程" : "展开行程"}
          onClick={() => setSheetExpanded((expanded) => !expanded)}
        />
        <div className="panel-heading">
          <div>
            <span className="eyebrow">我的行程</span>
            <h1>秋日关西</h1>
            <p>9月18日 – 9月25日 · 8天</p>
          </div>
          <button className="compact-control" aria-label="编辑行程">编辑</button>
        </div>

        <div className="travelers-row">
          <div className="avatar-stack" aria-label="3位同行者">
            <span>V</span><span>M</span><span>J</span>
          </div>
          <span>3 位同行者</span>
          <button aria-label="添加同行者">＋</button>
        </div>

        <div className="day-list" role="list">
          {stops.map((stop, index) => (
            <button
              key={stop.id}
              className={`day-row ${selected.id === stop.id ? "selected" : ""}`}
              onClick={() => setSelectedId(stop.id)}
              role="listitem"
            >
              <span className="timeline-column">
                <i style={{ background: stop.color }}>{index + 1}</i>
                {index < stops.length - 1 && <b />}
              </span>
              <span className="day-copy">
                <small>{stop.day} · {stop.date}</small>
                <strong>{stop.city}</strong>
                <span>{stop.area}</span>
                <em>
                  <i aria-hidden="true">{symbolFallbacks[stop.symbol] ?? stop.symbol}</i>
                  {stop.time} · {stop.transport}
                </em>
              </span>
              <span className="row-weather">
                <i className="weather-symbol" aria-hidden="true">☼</i>
                <strong>{stop.temperature}°</strong>
              </span>
            </button>
          ))}
        </div>

        <button className="add-day-button"><span>＋</span> 添加一天</button>
      </aside>

      <aside className="place-panel standard-material" aria-live="polite">
        <div className="place-header">
          <div>
            <span className="eyebrow">{selected.day} · {selected.time}</span>
            <h2>{selected.city}</h2>
            <p>{selected.area}</p>
          </div>
          <button className="circle-control small" aria-label="关闭地点详情">×</button>
        </div>

        <section className="weather-card">
          <div className="weather-primary">
            <div><span>天气</span><strong>{selected.temperature}°</strong></div>
            <div className="weather-icon-large" aria-hidden="true"><i>☼</i><b>☁︎</b></div>
          </div>
          <p>{selected.condition} · 最高 {selected.temperature + 2}° 最低 {selected.temperature - 5}°</p>
          <div className="hourly-weather">
            {["现在", "12时", "15时", "18时"].map((time, index) => (
              <span key={time}><small>{time}</small><i>{index === 3 ? "☾" : "☼"}</i><strong>{selected.temperature + 1 - index}°</strong></span>
            ))}
          </div>
        </section>

        <section className="place-summary">
          <h3>今日概览</h3>
          <p>{selected.summary}</p>
        </section>

        <div className="stat-grid">
          <div><span>当地时间</span><strong>10:42</strong><small>GMT+9</small></div>
          <div><span>降水概率</span><strong>10%</strong><small>未来 6 小时</small></div>
        </div>

        <button className="primary-button"><span>↗</span> 查看地点</button>
      </aside>

      <div className="map-tools glass-control" aria-label="地图工具">
        <button aria-label="定位到我的位置">⌖</button>
        <i />
        <button aria-label="放大地图">＋</button>
        <button aria-label="缩小地图">−</button>
      </div>

      <section className="playback glass-control" aria-label="行程播放控制">
        <button className="skip-button" aria-label="上一个地点" onClick={() => setProgress(Math.max(0, progress - 15))}>‹</button>
        <button
          className="play-button"
          aria-label={isPlaying ? "暂停行程" : "播放行程"}
          onClick={() => setIsPlaying((playing) => !playing)}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>
        <button className="skip-button" aria-label="下一个地点" onClick={() => setProgress(Math.min(100, progress + 15))}>›</button>
        <div className="playback-copy">
          <span><strong>香港</strong><i>飞往</i><strong>东京</strong></span>
          <div className="progress-track" onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setProgress(((event.clientX - rect.left) / rect.width) * 100);
          }}>
            <i style={{ width: `${progress}%` }} />
            <b style={{ left: `${progress}%` }} />
          </div>
        </div>
        <span className="time-left">4小时15分</span>
      </section>

      {shareOpen && (
        <div className="share-popover standard-material" role="dialog" aria-label="分享行程">
          <div className="popover-notch" />
          <div className="share-heading"><strong>分享“秋日关西”</strong><button onClick={() => setShareOpen(false)}>×</button></div>
          <div className="share-preview">
            <span className="share-map-mini"><i>✈︎</i></span>
            <span><strong>秋日关西</strong><small>8天 · 4座城市 · 3位同行者</small></span>
          </div>
          <button className="copy-link" onClick={() => setCopied(true)}>
            <span>⌘</span><strong>{copied ? "已复制链接" : "复制行程链接"}</strong><em>{copied ? "✓" : "›"}</em>
          </button>
          <button className="copy-link" onClick={() => setCopied(true)}>
            <span>＋</span><strong>复制为我的行程</strong><em>›</em>
          </button>
          <p>拥有链接的人可以查看，只有你和同行者可以编辑。</p>
        </div>
      )}

      <div className="mobile-tab-bar glass-control" aria-label="手机底部导航">
        {navItems.map(([label, icon]) => (
          <button key={label} className={activeNav === label ? "active" : ""} onClick={() => setActiveNav(label)}>
            <span>{symbolFallbacks[icon]}</span><small>{label}</small>
          </button>
        ))}
      </div>
    </main>
  );
}
