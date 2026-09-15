"use client";
import { useState } from "react";
import type { JourneySegment } from "./journeyData";
import { localInputDate } from "./composerLogic";
import { realScheduleProblem, zonedPlanTime } from "./realJourney";

export default function TravelPlanEditor({ segment, onSave, onCancel }: { segment: JourneySegment; onSave: (value: JourneySegment) => void; onCancel: () => void }) {
  const plan = segment.travelPlan;
  const initialZone = plan?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const split = (iso?: string) => {
    if (!iso || !Number.isFinite(Date.parse(iso))) return null;
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: initialZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  };
  const start = split(plan?.departureAt || segment.operational?.scheduledDepartureAt), end = split(plan?.arrivalAt || segment.operational?.scheduledArrivalAt);
  const [date, setDate] = useState(start?.date || (/^\d{4}-\d{2}-\d{2}$/.test(segment.date) ? segment.date : localInputDate()));
  const [departure, setDeparture] = useState(start?.time || segment.departure);
  const [arrivalDate, setArrivalDate] = useState(end?.date || date);
  const [arrival, setArrival] = useState(end?.time || segment.arrival);
  const [zone, setZone] = useState(initialZone);
  const problem = realScheduleProblem(date, departure, arrivalDate, arrival, zone);
  return <form className="real-plan-editor" onSubmit={event => {
    event.preventDefault(); if (problem) return;
    const departureAt = zonedPlanTime(date, departure, zone)!, arrivalAt = zonedPlanTime(arrivalDate, arrival, zone)!;
    onSave({ ...segment, date, departure, arrival, durationMinutes: (Date.parse(arrivalAt) - Date.parse(departureAt)) / 60000,
      travelPlan: { ...plan, mode: "real", departureAt, arrivalAt, timeZone: zone } });
  }}>
    <h3>真实行程时刻</h3>
    <label>出发日期<input aria-label="编辑出发日期" type="date" value={date} onInput={e => setDate(e.currentTarget.value)} onChange={e => setDate(e.target.value)} required /></label>
    <label>出发时间<input aria-label="编辑出发时间" type="time" value={departure} onInput={e => setDeparture(e.currentTarget.value)} onChange={e => setDeparture(e.target.value)} required /></label>
    <label>到达日期<input aria-label="编辑到达日期" type="date" value={arrivalDate} onInput={e => setArrivalDate(e.currentTarget.value)} onChange={e => setArrivalDate(e.target.value)} required /></label>
    <label>到达时间<input aria-label="编辑到达时间" type="time" value={arrival} onInput={e => setArrival(e.currentTarget.value)} onChange={e => setArrival(e.target.value)} required /></label>
    <label>时间基准<input aria-label="编辑计划时区" value={zone} onChange={e => setZone(e.target.value.trim())} required /></label>
    <p>出发和到达均按 {zone} 显示。跨时区旅行请先换算；计划时间不代表承运方实时状态。</p>
    {problem && <p role="status">{problem}</p>}
    <div><button type="button" onClick={onCancel}>取消</button><button type="submit" disabled={Boolean(problem)}>保存真实时刻</button></div>
  </form>;
}
