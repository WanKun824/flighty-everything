export type FollowCameraState = {
  center: [number, number];
  bearing: number;
};

function shortestAngle(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function shortestLongitude(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

export function smoothFollowCamera(
  current: FollowCameraState,
  target: FollowCameraState,
  elapsedMs: number,
): FollowCameraState {
  const elapsed = Math.max(0, Math.min(80, elapsedMs));
  const centerBlend = 1 - Math.exp(-elapsed / 150);
  const bearingBlend = 1 - Math.exp(-elapsed / 240);
  const longitudeDelta = shortestLongitude(current.center[0], target.center[0]);

  return {
    center: [
      current.center[0] + longitudeDelta * centerBlend,
      current.center[1] + (target.center[1] - current.center[1]) * centerBlend,
    ],
    bearing: current.bearing + shortestAngle(current.bearing, target.bearing) * bearingBlend,
  };
}
