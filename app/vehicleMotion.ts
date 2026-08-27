import type { JourneyMode } from "./journeyData";

export type VehicleMotionStage = "departing" | "cruising" | "arriving";

export type VehicleStageMotion = {
  stage: VehicleMotionStage;
  lift: number;
  pitch: number;
  velocity: number;
  trail: number;
};

const DEPARTURE_END = 0.18;
const ARRIVAL_START = 0.82;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function normalizedProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(1, progress));
}

export function motionStageForProgress(progress: number): VehicleMotionStage {
  const value = normalizedProgress(progress);
  if (value < DEPARTURE_END) return "departing";
  if (value > ARRIVAL_START) return "arriving";
  return "cruising";
}

export function vehicleStageMotion(kind: JourneyMode, progress: number): VehicleStageMotion {
  const value = normalizedProgress(progress);
  const stage = motionStageForProgress(value);
  const departure = smoothstep(value / DEPARTURE_END);
  const arrival = smoothstep((value - ARRIVAL_START) / (1 - ARRIVAL_START));
  const cruiseEnvelope = value < DEPARTURE_END
    ? departure
    : value > ARRIVAL_START
      ? 1 - arrival
      : 1;

  if (kind === "flight") {
    return {
      stage,
      lift: cruiseEnvelope * 0.16,
      pitch: stage === "departing" ? (1 - departure) * 0.12 : stage === "arriving" ? -arrival * 0.085 : 0,
      velocity: 0.3 + cruiseEnvelope * 0.7,
      trail: cruiseEnvelope,
    };
  }

  if (kind === "car") {
    return {
      stage,
      lift: 0,
      pitch: 0,
      velocity: 1,
      trail: 0.52,
    };
  }

  if (kind === "train") {
    return {
      stage,
      lift: 0,
      pitch: 0,
      velocity: 0.12 + cruiseEnvelope * 0.88,
      trail: cruiseEnvelope * 0.38,
    };
  }

  return {
    stage,
    lift: cruiseEnvelope * 0.018,
    pitch: stage === "departing" ? (1 - departure) * 0.025 : stage === "arriving" ? -arrival * 0.02 : 0,
    velocity: 0.22 + cruiseEnvelope * 0.78,
    trail: cruiseEnvelope * 0.76,
  };
}
