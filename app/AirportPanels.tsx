"use client";

import { useEffect, useState } from "react";
import SheetHeader from "./SheetHeader";
import { SHEET_DETENTS } from "./sheetLayout";
import SFAirplane from "sf-symbols-lib/monochrome/SFAirplane";
import SFLocationFill from "sf-symbols-lib/monochrome/SFLocationFill";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFStar from "sf-symbols-lib/monochrome/SFStar";
import SFStarFill from "sf-symbols-lib/monochrome/SFStarFill";
import SFMagnifyingglass from "sf-symbols-lib/monochrome/SFMagnifyingglass";
import { AIRPORTS, type Region } from "./flightyData";
import { loadAirportCatalog, matchAirportCatalog, type AirportCatalogEntry } from "./airportCatalog";
import { useSheetDetents } from "./useSheetDetents";
import "./airport-panels.css";

// Only factual identity/coordinates are used. Static demonstration delay rates
// must never turn into an apparent live operational status.
const regionalCode = { Asia: "AS", "North America": "NA", Europe: "EU" };
const initialCatalog: AirportCatalogEntry[] = AIRPORTS.map(airport => ({
  ...airport, kind: "airport", continent: regionalCode[airport.region], minZoom: 0,
}));

function useCatalog() {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    loadAirportCatalog().then(entries => { if (live) { setCatalog(entries); setLoadState("ready"); } })
      .catch(() => { if (live) setLoadState("error"); });
    return () => { live = false; };
  }, [retry]);
  return { catalog, loadState, retry: () => { setLoadState("loading"); setRetry(value => value + 1); } };
}

export function AirportsSheet({ region, setRegion, favorites, activeCodes, onFavorite, onAirport, onClose, onShare }: {
  region: "All" | Region; setRegion: (region: "All" | Region) => void;
  favorites: string[]; activeCodes: string[]; onFavorite: (code: string) => void;
  onAirport: (code: string) => void; onClose: () => void; onShare: () => void;
}) {
  const sheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .57, minimumHeight: 256 });
  const { catalog, loadState, retry } = useCatalog();
  const [query, setQuery] = useState("");

  const filtered = catalog.filter(airport => region === "All" || airport.continent === regionalCode[region]).sort((a, b) => a.minZoom - b.minZoom || a.name.localeCompare(b.name));
  const preferredCodes = new Set([...favorites, ...activeCodes]);
  const preferred = filtered.filter(airport => preferredCodes.has(airport.code));
  const results = query.trim() ? matchAirportCatalog(filtered, query) : filtered.filter(airport => !preferredCodes.has(airport.code)).slice(0, 60);
  const row = (airport: AirportCatalogEntry) => <AirportRow key={airport.code} airport={airport} favorite={favorites.includes(airport.code)} onFavorite={onFavorite} onAirport={onAirport} />;
  return <section {...sheet.sheetProps} className={`map-sheet airports-sheet coordinated-airport-sheet ${sheet.dragging ? "is-dragging" : ""}`} style={{ height: `${sheet.fraction * 100}%` }} role="dialog" aria-label="机场资料与收藏">
    <SheetHeader className="airport-panel-heading" title="机场" onShare={onShare} onClose={onClose} />
    <div className="region-tabs" aria-label="机场所在地区">{([['All', '全部'], ['Asia', '亚洲'], ['North America', '北美洲'], ['Europe', '欧洲']] as const).map(([value, label]) => <button key={value} aria-pressed={region === value} className={region === value ? "active" : ""} onClick={() => setRegion(value)}>{label}</button>)}</div>
    <label className="airport-search-field"><SFMagnifyingglass size="sm" /><input type="search" placeholder="搜索机场、城市、IATA / ICAO" aria-label="搜索所有机场" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="map-sheet-scroll airport-groups">
      {!query.trim() && preferred.length > 0 && <section><h3>收藏与行程</h3><p className="airport-data-note">收藏与当前旅程途经的机场</p>{preferred.map(row)}</section>}
      <section><h3>{query.trim() ? "搜索结果" : "机场"}</h3><p className="airport-data-note">按名称、城市或代码查找机场。</p>{results.map(row)}{!results.length && <p className="airport-data-note">未找到匹配机场，请试试城市或机场代码。</p>}</section>
      {loadState === "error" && <button className="airport-load-state" onClick={retry}>完整机场资料加载失败，点此重试</button>}
      {loadState === "loading" && <p className="airport-data-note" role="status">正在加载完整机场资料…</p>}
      {!query.trim() && filtered.length > 60 && <p className="airport-data-note">更多机场可在地图上点选，或通过名称、代码搜索。</p>}
    </div>
  </section>;
}

function AirportRow({ airport, favorite, onFavorite, onAirport }: { airport: AirportCatalogEntry; favorite: boolean; onFavorite: (code: string) => void; onAirport: (code: string) => void }) {
  return <article className="airport-row unknown">
    <button className="airport-main" onClick={() => onAirport(airport.code)}><span className="airport-catalog-icon"><SFAirplane size="sm" /></span><div><strong>{airport.name}</strong><span className="airport-identity">{airport.icao} · {airport.city}, {airport.country}</span></div></button>
    <button className="favorite-button" aria-label={`${favorite ? "取消收藏" : "收藏"} ${airport.name}`} aria-pressed={favorite} onClick={() => onFavorite(airport.code)}>{favorite ? <SFStarFill size="sm" /> : <SFStar size="sm" />}</button>
    <small className="airport-code">{airport.code}</small>
  </article>;
}

export function AirportDetailSheet({ code, favorite, onFavorite, onBack, onPlan }: { code: string; favorite: boolean; onFavorite: () => void; onBack: () => void; onPlan: (place: AirportCatalogEntry, field: "origin" | "destination") => void }) {
  const sheet = useSheetDetents({ detents: SHEET_DETENTS, initial: .57, minimumHeight: 256 });
  const { catalog, loadState, retry } = useCatalog();
  const airport = catalog.find(entry => entry.code === code);
  return <section {...sheet.sheetProps} className={`map-sheet airport-detail-sheet coordinated-airport-sheet ${sheet.dragging ? "is-dragging" : ""}`} style={{ height: `${sheet.fraction * 100}%` }} role="dialog" aria-label={`${code} 机场详情`}>
    <SheetHeader className="airport-panel-heading" title={airport?.name ?? code} subtitle={`${code}${airport ? ` · ${airport.icao}` : ""}`} back backLabel="返回机场列表" onClose={onBack}><button className="favorite-button" aria-label={`${favorite ? "取消收藏" : "收藏"} ${airport?.name ?? code}`} aria-pressed={favorite} onClick={onFavorite}>{favorite ? <SFStarFill /> : <SFStar />}</button></SheetHeader>
    <div className="map-sheet-scroll airport-detail-content">
      {airport ? <><p className="airport-location">{airport.city} · {airport.country}</p><dl className="airport-facts"><div><dt>{/^[A-Z]{3}$/.test(airport.code) ? "IATA" : "机场代码"}</dt><dd>{airport.code}</dd></div><div><dt>{/^[A-Z]{4}$/.test(airport.icao) ? "ICAO" : "本地代码"}</dt><dd>{airport.icao}</dd></div><div><dt>纬度</dt><dd>{airport.coordinate[1].toFixed(4)}°</dd></div><div><dt>经度</dt><dd>{airport.coordinate[0].toFixed(4)}°</dd></div></dl><div className="airport-route-actions"><button onClick={() => onPlan(airport, "origin")}><SFLocationFill size="sm" />从这里出发</button><button onClick={() => onPlan(airport, "destination")}><SFPlus size="sm" />前往这里</button></div><p className="airport-data-note">机场基础资料 · <a href="https://ourairports.com/data/" target="_blank" rel="noreferrer">OurAirports</a></p></> : <p role="status">{loadState === "loading" ? "正在加载机场资料…" : "未找到该机场的资料。不会显示其他机场的信息。"}</p>}
      {loadState === "error" && <button className="airport-load-state" onClick={retry}>加载失败，重试</button>}
    </div>
  </section>;
}
