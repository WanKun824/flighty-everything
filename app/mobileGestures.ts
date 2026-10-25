export function finishBackGesture(distance: number, velocity: number, width: number) {
  return distance > Math.min(120, width * .28) || (distance > 24 && velocity > 600);
}

export function projectedDetent(fraction: number, velocity: number, height: number, detents: readonly number[]) {
  const projected = fraction - velocity * 140 / Math.max(1, height);
  return detents.reduce((nearest, value) => Math.abs(value - projected) < Math.abs(nearest - projected) ? value : nearest);
}
