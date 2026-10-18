"use client";

import { useState, type CSSProperties } from "react";
import SFChevronRight from "sf-symbols-lib/monochrome/SFChevronRight";
import SFPlus from "sf-symbols-lib/monochrome/SFPlus";
import SFTrash from "sf-symbols-lib/monochrome/SFTrash";
import SFXmark from "sf-symbols-lib/monochrome/SFXmark";
import { MODE_META, journeyStats, type JourneyMode, type JourneySegment } from "./journeyData";
import {
  TRIP_COLORS,
  TRIP_MOTIFS,
  type JourneyMotif,
  type JourneyTrip,
} from "./journeyStorage";

export function TripPassportStrip({ trips, activeTripId, onSelect, onCreate, onManage }: {
  trips: JourneyTrip[];
  activeTripId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onManage: () => void;
}) {
  return (
    <div className="trip-passport-strip" aria-label="行程护照">
      <div className="trip-passport-cards">
        {trips.map((trip) => {
          const stats = journeyStats(trip.segments);
          return (
            <button
              key={trip.id}
              className={`trip-passport-card motif-${trip.motif} ${trip.id === activeTripId ? "active" : ""}`}
              style={{ "--trip-color": trip.color } as CSSProperties}
              onClick={() => onSelect(trip.id)}
            >
              <span className="passport-landmark" aria-hidden="true"><i /><b /><em /></span>
              <small>我的旅迹</small>
              <strong>{trip.name}</strong>
              <span className="passport-metrics"><b>{stats.segments} 段</b><b>{stats.cities} 城</b><b>{stats.distanceKm.toLocaleString()} km</b></span>
            </button>
          );
        })}
      </div>
      <span className="trip-passport-actions">
        <button onClick={onCreate}><SFPlus size="xs" />新行程</button>
        <button onClick={onManage}>管理<SFChevronRight size="xs" /></button>
      </span>
    </div>
  );
}

export function TripManagerDialog({ trip, tripCount, onClose, onRename, onAppearance, onDelete, onCreate, onUpdateSegment, onRemoveSegment }: {
  trip: JourneyTrip;
  tripCount: number;
  onClose: () => void;
  onRename: (name: string) => void;
  onAppearance: (color: string, motif: JourneyMotif) => void;
  onDelete: () => void;
  onCreate: (name: string) => void;
  onUpdateSegment: (segment: JourneySegment) => void;
  onRemoveSegment: (id: string) => void;
}) {
  const [name, setName] = useState(trip.name);
  const [newName, setNewName] = useState("");
  return (
    <section className="trip-manager-dialog" role="dialog" aria-modal="true" aria-label="行程管理">
      <header><div><small>旅程</small><h2>行程管理</h2><p>命名、配色并用地标剪影区分不同旅行。</p></div><button aria-label="关闭" onClick={onClose}><SFXmark size="sm" /></button></header>
      <label><span>当前行程名称</span><input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => onRename(name)} /></label>
      <div className="trip-style-picker"><span>护照颜色</span><div>{TRIP_COLORS.map((color) => <button key={color} aria-label={`选择 ${color}`} className={trip.color === color ? "active" : ""} style={{ background: color }} onClick={() => onAppearance(color, trip.motif)} />)}</div></div>
      <div className="trip-motif-picker"><span>地标剪影</span><div>{TRIP_MOTIFS.map((motif) => <button key={motif} className={trip.motif === motif ? "active" : ""} onClick={() => onAppearance(trip.color, motif)}><i className={`mini-landmark motif-${motif}`} />{{ torii: "鸟居", mountain: "山岳", skyline: "天际线", pagoda: "古塔" }[motif]}</button>)}</div></div>
      <div className="trip-segment-manager">
        <span>路线分段编辑</span>
        {trip.segments.map((segment, index) => (
          <div key={segment.id}>
            <b>{index + 1}</b>
            <select value={segment.mode} aria-label={`第 ${index + 1} 段交通方式`} onChange={(event) => onUpdateSegment({ ...segment, mode: event.target.value as JourneyMode })}>{(Object.keys(MODE_META) as JourneyMode[]).map((mode) => <option key={mode} value={mode}>{MODE_META[mode].label}</option>)}</select>
            <span><input aria-label={`第 ${index + 1} 段名称`} value={segment.title} onChange={(event) => onUpdateSegment({ ...segment, title: event.target.value })} /><small>{segment.origin.name} → {segment.destination.name}</small></span>
            <input aria-label={`第 ${index + 1} 段车次`} value={segment.service} onChange={(event) => onUpdateSegment({ ...segment, service: event.target.value })} />
            <button aria-label={`删除第 ${index + 1} 段`} onClick={() => onRemoveSegment(segment.id)}><SFTrash size="xs" /></button>
          </div>
        ))}
        {!trip.segments.length && <p>这个行程还没有路线，请用“新增路线”搜索第一个地点。</p>}
      </div>
      <label className="new-trip-field"><span>建立另一段旅行</span><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="例如：京都红叶周末" /></label>
      <button className="create-trip-button" disabled={!newName.trim()} onClick={() => { onCreate(newName); onClose(); }}><SFPlus size="xs" />新建并切换</button>
      <button className="delete-trip-button" disabled={tripCount <= 1} onClick={onDelete}><SFTrash size="xs" />删除当前行程</button>
    </section>
  );
}
