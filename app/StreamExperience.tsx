"use client";

import {
  ArrowRight, Bell, Bookmark, Check, ChevronDown, ChevronRight, CircleUserRound,
  CloudSun, Earth, Heart, Link2, LockKeyhole, LogOut, MapPin, MessageCircle,
  MoreHorizontal, Plane, Play, Plus, Route, Search, Send, Settings, Share2,
  Ship, Sparkles, TrainFront, UserPlus, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ExploreScreen } from "./LegacyApp";

type Surface = "journey" | "discover" | "library";
type Sheet = "comments" | "share" | "account" | "notifications" | "saved" | "create" | "detail" | "search" | null;
type Comment = { id: string; author: string; text: string; time: string };
type Account = { name: string; email: string };
type Journey = { id: string; title: string; dates: string; route: string; status: string; progress: number; cover: string };
type Post = {
  id: string; author: string; handle: string; avatar: string; time: string; place: string;
  title: string; body: string; image: string; route: string[]; transport: "plane" | "train" | "ship";
  likes: number; commentCount: number; weather: string;
};

const posts: Post[] = [
  {
    id: "kyoto", author: "林夏", handle: "@linxia", time: "18 分钟前", place: "日本 · 京都",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
    title: "京都醒来以前，沿鸭川走一段", body: "把京都站、祇园和南禅寺串成一条不用赶路的晨间路线。六点十分，桥上只有自行车和第一班送货车。",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=90",
    route: ["京都站", "祇园", "南禅寺"], transport: "train", likes: 1284, commentCount: 46, weather: "18°C · 晴",
  },
  {
    id: "fjord", author: "周屿", handle: "@islandzhou", time: "1 小时前", place: "挪威 · 弗洛姆",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
    title: "换乘不是中断，是风景改变的方式", body: "从奥斯陆坐火车越过雪线，在米达尔换乘山地列车，最后让轮船带我们进入松恩峡湾。每一种速度都有自己的镜头。",
    image: "https://images.unsplash.com/photo-1520769945061-0a448c463865?auto=format&fit=crop&w=1600&q=90",
    route: ["奥斯陆", "米达尔", "弗洛姆"], transport: "ship", likes: 986, commentCount: 31, weather: "12°C · 微风",
  },
  {
    id: "seoul", author: "Mina", handle: "@minaroad", time: "昨天", place: "韩国 · 首尔",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
    title: "48 小时，把首尔的夜晚留给汉江", body: "旧街、设计商店、唱片酒吧，最后坐上沿江公交。这个周末行程已经公开，欢迎复制后改成自己的版本。",
    image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1600&q=90",
    route: ["仁川机场", "圣水洞", "汉江"], transport: "plane", likes: 2147, commentCount: 88, weather: "24°C · 多云",
  },
];

const seedJourneys: Journey[] = [
  { id: "japan", title: "日本海岸线", dates: "9月18日—27日", route: "香港 → 东京 → 镰仓 → 京都", status: "即将出发", progress: 64, cover: posts[0].image },
  { id: "norway", title: "挪威峡湾慢行", dates: "10月3日—9日", route: "奥斯陆 → 米达尔 → 弗洛姆", status: "规划中", progress: 22, cover: posts[1].image },
  { id: "seoul-weekend", title: "首尔周末", dates: "6月12日—14日", route: "仁川 → 圣水洞 → 汉江", status: "已完成", progress: 100, cover: posts[2].image },
];

const seedComments: Record<string, Comment[]> = {
  kyoto: [
    { id: "c1", author: "阿泽", text: "路线已复制，晨间的鸭川真的很舒服。", time: "8 分钟前" },
    { id: "c2", author: "Yuki", text: "南禅寺建议再留半小时，光线很好。", time: "3 分钟前" },
  ],
  fjord: [{ id: "c3", author: "麦子", text: "火车接轮船这个节奏太好了。", time: "26 分钟前" }],
  seoul: [{ id: "c4", author: "Nora", text: "已收藏，周末照着走。", time: "昨天" }],
};

function ModeIcon({ mode }: { mode: Post["transport"] }) {
  return mode === "plane" ? <Plane size={14} /> : mode === "ship" ? <Ship size={14} /> : <TrainFront size={14} />;
}

function RouteLine({ post }: { post: Post }) {
  return <div className="orbit-route-line" aria-label={post.route.join("到")}>
    {post.route.map((stop, index) => <span key={stop}><i>{index === 1 ? <ModeIcon mode={post.transport} /> : <b />}</i><small>{stop}</small></span>)}
  </div>;
}

function JourneyHero({ onOpen }: { onOpen: () => void }) {
  return <section className="orbit-journey-intro">
    <div className="orbit-hero-art" /><div className="orbit-hero-overlay" />
    <div className="orbit-hero-copy">
      <span><Sparkles size={13} /> JOURNEYS IN MOTION</span>
      <h1>让地球，<br />播放你的旅程。</h1>
      <p>真实地点、交通工具与沿途回忆，在一条会流动的地图上重新发生。</p>
      <button onClick={onOpen}><Play size={15} fill="currentColor" /> 播放示例行程</button>
    </div>
    <div className="orbit-hero-route"><span>下一段旅程 · 还有 26 天</span><strong>日本海岸线</strong><small>香港 → 东京 → 镰仓 → 京都</small></div>
  </section>;
}

function Discover({
  liked, saved, followed, onLike, onSave, onFollow, onComments, onShare, onJourney,
}: {
  liked: Set<string>; saved: Set<string>; followed: Set<string>;
  onLike: (id: string) => void; onSave: (id: string) => void; onFollow: (id: string) => void;
  onComments: (post: Post) => void; onShare: (post: Post) => void; onJourney: (post: Post) => void;
}) {
  return <div className="orbit-discover">
    <JourneyHero onOpen={() => onJourney(posts[0])} />
    <div className="orbit-feed-heading">
      <div><span>COMMUNITY</span><h1>旅程正在发生</h1><p>来自旅行者的真实路线、节点和沿途记录。</p></div>
      <div className="orbit-live-people">{posts.map((post) => <button key={post.id} onClick={() => onJourney(post)}><img src={post.avatar} alt={post.author} /><span>{post.author}</span></button>)}</div>
    </div>
    <main className="orbit-feed">
      {posts.map((post) => <article className="orbit-post" key={post.id}>
        <header>
          <img src={post.avatar} alt={post.author} />
          <div><strong>{post.author}</strong><span>{post.handle} · {post.time}</span></div>
          <button className={followed.has(post.id) ? "is-following" : ""} onClick={() => onFollow(post.id)}>{followed.has(post.id) ? <><Check size={14} /> 已关注</> : <><UserPlus size={14} /> 关注</>}</button>
          <button aria-label="更多"><MoreHorizontal size={18} /></button>
        </header>
        <button className="orbit-post-media" onClick={() => onJourney(post)} aria-label={"打开" + post.title}>
          <img src={post.image} alt={post.title} /><span><MapPin size={13} /> {post.place}</span><i><Play size={16} fill="currentColor" /></i>
        </button>
        <div className="orbit-post-body">
          <div className="orbit-post-label"><span>{post.weather}</span><span>公开行程</span></div>
          <h2>{post.title}</h2><p>{post.body}</p><RouteLine post={post} />
          <div className="orbit-post-actions">
            <div>
              <button className={liked.has(post.id) ? "is-active" : ""} onClick={() => onLike(post.id)}><Heart size={17} fill={liked.has(post.id) ? "currentColor" : "none"} /> {post.likes + (liked.has(post.id) ? 1 : 0)}</button>
              <button onClick={() => onComments(post)}><MessageCircle size={17} /> {post.commentCount}</button>
              <button onClick={() => onShare(post)}><Share2 size={17} /> 分享</button>
            </div>
            <button className={saved.has(post.id) ? "is-active" : ""} onClick={() => onSave(post.id)} aria-label="收藏"><Bookmark size={18} fill={saved.has(post.id) ? "currentColor" : "none"} /></button>
          </div>
        </div>
      </article>)}
    </main>
  </div>;
}

function JourneyLibrary({ journeys, onCreate, onOpen, onPlay }: { journeys: Journey[]; onCreate: () => void; onOpen: (journey: Journey) => void; onPlay: () => void }) {
  const planned = journeys.filter((item) => item.status !== "已完成");
  const finished = journeys.filter((item) => item.status === "已完成");
  return <div className="orbit-library">
    <header className="orbit-page-heading"><span>YOUR JOURNEYS</span><h1>我的行程</h1><p>从计划、播放到回忆，所有旅程都在同一条时间线上。</p><button onClick={onCreate}><Plus size={15} /> 新建行程</button></header>
    <section className="orbit-next-trip">
      <img src={journeys[0]?.cover || posts[0].image} alt="" /><div />
      <article><span>下一段旅程 · 还有 26 天</span><h2>{journeys[0]?.title || "日本海岸线"}</h2><p>{journeys[0]?.route}</p><button onClick={onPlay}><Play size={15} fill="currentColor" /> 在地球上播放</button></article>
      <aside><strong>{journeys[0]?.progress || 0}%</strong><small>行程已完善</small></aside>
    </section>
    <section className="orbit-trip-list"><header><h2>计划中</h2><span>{planned.length} 条</span></header>{planned.map((journey) => <button key={journey.id} onClick={() => onOpen(journey)}><img src={journey.cover} alt="" /><span><small>{journey.status} · {journey.dates}</small><strong>{journey.title}</strong><em>{journey.route}</em></span><i>{journey.progress}%</i><ChevronRight size={17} /></button>)}</section>
    <section className="orbit-trip-list"><header><h2>旅行回忆</h2><span>{finished.length} 条</span></header>{finished.map((journey) => <button key={journey.id} onClick={() => onOpen(journey)}><img src={journey.cover} alt="" /><span><small>{journey.status} · {journey.dates}</small><strong>{journey.title}</strong><em>{journey.route}</em></span><i>回看</i><ChevronRight size={17} /></button>)}</section>
  </div>;
}

function SheetFrame({ title, eyebrow, close, children }: { title: string; eyebrow: string; close: () => void; children: React.ReactNode }) {
  return <div className="orbit-sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><aside className="orbit-sheet" role="dialog" aria-modal="true"><button className="orbit-sheet-close" onClick={close} aria-label="关闭"><X size={18} /></button><header><span>{eyebrow}</span><h2>{title}</h2></header>{children}</aside></div>;
}

export default function StreamExperience() {
  const [surface, setSurface] = useState<Surface>("journey");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePost, setActivePost] = useState<Post>(posts[0]);
  const [activeJourney, setActiveJourney] = useState<Journey>(seedJourneys[0]);
  const [liked, setLiked] = useState(new Set<string>(["kyoto"]));
  const [saved, setSaved] = useState(new Set<string>(["fjord"]));
  const [followed, setFollowed] = useState(new Set<string>());
  const [comments, setComments] = useState<Record<string, Comment[]>>(seedComments);
  const [commentText, setCommentText] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [journeys, setJourneys] = useState<Journey[]>(seedJourneys);
  const [newTrip, setNewTrip] = useState({ title: "", start: "2026-09-18", end: "2026-09-27", route: "" });
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedAccount = localStorage.getItem("orbit-account"); const savedTrips = localStorage.getItem("orbit-journeys");
      if (savedAccount) setAccount(JSON.parse(savedAccount)); if (savedTrips) setJourneys(JSON.parse(savedTrips));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("orbit-journeys", JSON.stringify(journeys)); } catch {} }, [journeys]);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    const keys = (event: KeyboardEvent) => { if (event.key === "Escape") { setSheet(null); setMenuOpen(false); } if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSheet("search"); } };
    document.addEventListener("mousedown", outside); window.addEventListener("keydown", keys);
    return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("keydown", keys); };
  }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2200); return () => window.clearTimeout(timer); }, [toast]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => setter((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const openPost = (post: Post, kind: Sheet) => { setActivePost(post); setSheet(kind); };
  const openJourney = (journey: Journey) => { setActiveJourney(journey); setSheet("detail"); };
  const submitComment = (event: FormEvent) => {
    event.preventDefault(); if (!commentText.trim()) return;
    const next = { id: String(Date.now()), author: account?.name || "旅行者", text: commentText.trim(), time: "刚刚" };
    setComments((current) => ({ ...current, [activePost.id]: [...(current[activePost.id] || []), next] })); setCommentText("");
  };
  const submitAccount = (event: FormEvent) => {
    event.preventDefault(); const next = { name: accountName.trim() || "ORBIT 旅行者", email: accountEmail.trim() };
    setAccount(next); try { localStorage.setItem("orbit-account", JSON.stringify(next)); } catch {}
    setToast(accountMode === "login" ? "欢迎回来" : "账号已创建"); setSheet(null);
  };
  const logout = () => { setAccount(null); try { localStorage.removeItem("orbit-account"); } catch {} setToast("已退出账号"); };
  const createJourney = (event: FormEvent) => {
    event.preventDefault(); if (!newTrip.title.trim()) return;
    const journey: Journey = { id: String(Date.now()), title: newTrip.title.trim(), dates: newTrip.start + "—" + newTrip.end, route: newTrip.route.trim() || "待添加地点", status: "规划中", progress: 8, cover: posts[journeys.length % posts.length].image };
    setJourneys((current) => [journey, ...current]); setActiveJourney(journey); setSheet("detail"); setToast("行程已创建");
    setNewTrip({ title: "", start: "2026-09-18", end: "2026-09-27", route: "" });
  };
  const share = async () => {
    const url = window.location.origin + "/?journey=" + encodeURIComponent(activePost.id);
    try { await navigator.clipboard.writeText(url); setToast("分享链接已复制"); } catch { setToast("分享链接已准备"); }
    setSheet(null);
  };
  const searchResults = useMemo(() => {
    const value = query.trim().toLowerCase(); if (!value) return posts;
    return posts.filter((post) => (post.title + post.place + post.author + post.route.join("")).toLowerCase().includes(value));
  }, [query]);

  return <main className={"orbit-app surface-" + surface}>
    <header className="orbit-topbar">
      <button className="orbit-brand" onClick={() => setSurface("journey")}><span><Earth size={17} /></span><strong>ORBIT</strong></button>
      <nav aria-label="主导航">
        <button className={surface === "journey" ? "is-active" : ""} onClick={() => setSurface("journey")}><Route size={15} /> 行程</button>
        <button className={surface === "discover" ? "is-active" : ""} onClick={() => setSurface("discover")}><Sparkles size={15} /> 发现</button>
        <button className={surface === "library" ? "is-active" : ""} onClick={() => setSurface("library")}><Bookmark size={15} /> 我的行程</button>
      </nav>
      <div className="orbit-top-actions">
        <button onClick={() => setSheet("search")} aria-label="搜索"><Search size={18} /><span>搜索</span><kbd>⌘K</kbd></button>
        <div ref={menuRef}><button className="orbit-account-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}><CircleUserRound size={19} /><span>{account?.name || "账户"}</span><ChevronDown size={14} /></button>
          {menuOpen && <div className="orbit-account-menu">
            <div><span><CircleUserRound size={19} /></span><p><strong>{account?.name || "欢迎来到 ORBIT"}</strong><small>{account?.email || "登录后同步行程与评论"}</small></p></div>
            <button onClick={() => { setSheet("account"); setMenuOpen(false); }}><CircleUserRound size={16} /> 账户中心 <ChevronRight size={14} /></button>
            <button onClick={() => { setSheet("notifications"); setMenuOpen(false); }}><Bell size={16} /> 消息与提醒 <i>2</i></button>
            <button onClick={() => { setSheet("saved"); setMenuOpen(false); }}><Bookmark size={16} /> 我的收藏 <ChevronRight size={14} /></button>
            <button onClick={() => { setSheet("account"); setMenuOpen(false); }}><Settings size={16} /> 偏好设置 <ChevronRight size={14} /></button>
            {account && <button onClick={() => { logout(); setMenuOpen(false); }}><LogOut size={16} /> 退出登录</button>}
          </div>}
        </div>
      </div>
    </header>

    {surface === "journey" && <section className="orbit-globe-stage"><ExploreScreen /><div className="orbit-map-note"><span>LIVE</span><strong>日本海岸线</strong><small>第 1/5 段 · 香港 → 东京</small></div></section>}
    {surface === "discover" && <Discover liked={liked} saved={saved} followed={followed} onLike={(id) => toggleSet(setLiked, id)} onSave={(id) => toggleSet(setSaved, id)} onFollow={(id) => toggleSet(setFollowed, id)} onComments={(post) => openPost(post, "comments")} onShare={(post) => openPost(post, "share")} onJourney={(post) => openPost(post, "detail")} />}
    {surface === "library" && <JourneyLibrary journeys={journeys} onCreate={() => setSheet("create")} onOpen={openJourney} onPlay={() => setSurface("journey")} />}

    <div className="orbit-quick-dock"><button onClick={() => setSheet("create")}><Plus size={15} /> 新行程</button><i /><button onClick={() => setSurface("journey")}><Play size={14} fill="currentColor" /><span><small>继续播放 · 64%</small><strong>日本海岸线</strong></span></button></div>

    {sheet === "comments" && <SheetFrame title="评论" eyebrow={activePost.title} close={() => setSheet(null)}><div className="orbit-comment-list">{(comments[activePost.id] || []).map((comment) => <article key={comment.id}><span>{comment.author.slice(0, 1)}</span><p><strong>{comment.author}</strong><em>{comment.text}</em><small>{comment.time}</small></p></article>)}</div><form className="orbit-comment-form" onSubmit={submitComment}><span>{(account?.name || "旅").slice(0, 1)}</span><input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="写下你的评论…" /><button disabled={!commentText.trim()} aria-label="发送评论"><Send size={17} /></button></form></SheetFrame>}
    {sheet === "share" && <SheetFrame title="分享这段旅程" eyebrow="SHARE JOURNEY" close={() => setSheet(null)}><div className="orbit-share-preview"><img src={activePost.image} alt="" /><p><strong>{activePost.title}</strong><span>{activePost.route.join(" → ")}</span></p></div><button className="orbit-primary-row" onClick={share}><Link2 size={17} /> 复制分享链接</button><button className="orbit-secondary-row" onClick={() => { setToast("行程卡片已生成"); setSheet(null); }}><Share2 size={17} /> 生成分享卡片</button></SheetFrame>}
    {sheet === "account" && <SheetFrame title={account ? "账户中心" : accountMode === "login" ? "登录 ORBIT" : "创建账号"} eyebrow="ACCOUNT" close={() => setSheet(null)}>{account ? <div className="orbit-profile"><span>{account.name.slice(0, 1)}</span><h3>{account.name}</h3><p>{account.email}</p><div><b>3<small>行程</small></b><b>12<small>收藏</small></b><b>4<small>分享</small></b></div><button className="orbit-secondary-row"><Settings size={17} /> 账号与隐私</button><button className="orbit-secondary-row" onClick={logout}><LogOut size={17} /> 退出登录</button></div> : <form className="orbit-auth-form" onSubmit={submitAccount}>{accountMode === "register" && <label><span>昵称</span><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="你的旅行昵称" required /></label>}<label><span>邮箱</span><input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="name@example.com" required /></label><label><span>密码</span><input type="password" placeholder="至少 8 位" minLength={8} required /></label><button type="submit">{accountMode === "login" ? "登录" : "创建账号"} <ArrowRight size={16} /></button><button type="button" onClick={() => setAccountMode(accountMode === "login" ? "register" : "login")}>{accountMode === "login" ? "第一次使用？创建账号" : "已有账号？返回登录"}</button><small><LockKeyhole size={13} /> 演示账号只保存在当前设备</small></form>}</SheetFrame>}
    {sheet === "notifications" && <SheetFrame title="消息与提醒" eyebrow="INBOX" close={() => setSheet(null)}><div className="orbit-notices"><article><i><Route size={17} /></i><p><strong>日本海岸线已同步</strong><span>地图路线与 5 个地点已完成校验。</span><small>刚刚</small></p></article><article><i><CloudSun size={17} /></i><p><strong>京都天气有更新</strong><span>出发当日预计晴，18—24°C。</span><small>2 小时前</small></p></article></div></SheetFrame>}
    {sheet === "saved" && <SheetFrame title="我的收藏" eyebrow="SAVED" close={() => setSheet(null)}><div className="orbit-saved-list">{posts.filter((post) => saved.has(post.id)).map((post) => <button key={post.id} onClick={() => openPost(post, "detail")}><img src={post.image} alt="" /><span><strong>{post.title}</strong><small>{post.author} · {post.place}</small></span><ChevronRight size={15} /></button>)}{!posts.some((post) => saved.has(post.id)) && <p>还没有收藏的旅程。</p>}</div></SheetFrame>}
    {sheet === "create" && <SheetFrame title="新建行程" eyebrow="NEW JOURNEY" close={() => setSheet(null)}><form className="orbit-create-form" onSubmit={createJourney}><label><span>行程名称</span><input value={newTrip.title} onChange={(event) => setNewTrip({ ...newTrip, title: event.target.value })} placeholder="例如：日本海岸线" required /></label><div><label><span>开始</span><input type="date" value={newTrip.start} onChange={(event) => setNewTrip({ ...newTrip, start: event.target.value })} /></label><label><span>结束</span><input type="date" value={newTrip.end} onChange={(event) => setNewTrip({ ...newTrip, end: event.target.value })} /></label></div><label><span>路线</span><input value={newTrip.route} onChange={(event) => setNewTrip({ ...newTrip, route: event.target.value })} placeholder="香港 → 东京 → 京都" /></label><button type="submit">创建并编辑 <ArrowRight size={16} /></button></form></SheetFrame>}
    {sheet === "detail" && <SheetFrame title={activeJourney?.title || activePost.title} eyebrow="JOURNEY STORY" close={() => setSheet(null)}><div className="orbit-detail-cover"><img src={activeJourney?.cover || activePost.image} alt="" /><button onClick={() => { setSheet(null); setSurface("journey"); }}><Play size={18} fill="currentColor" /></button></div><p className="orbit-detail-route">{activeJourney?.route || activePost.route.join(" → ")}</p><div className="orbit-detail-actions"><button onClick={() => { setSheet(null); setSurface("journey"); }}><Earth size={16} /> 在地球上播放</button><button onClick={() => setSheet("share")}><Share2 size={16} /> 分享</button></div></SheetFrame>}
    {sheet === "search" && <div className="orbit-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheet(null); }}><section className="orbit-search"><label><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地点、旅程或旅行者" /><kbd>ESC</kbd></label><span>{query ? "搜索结果" : "正在流行"}</span>{searchResults.map((post) => <button key={post.id} onClick={() => openPost(post, "detail")}><img src={post.image} alt="" /><p><strong>{post.title}</strong><small>{post.author} · {post.place}</small></p><ChevronRight size={15} /></button>)}</section></div>}
    {toast && <div className="orbit-toast"><Check size={15} /> {toast}</div>}
  </main>;
}
