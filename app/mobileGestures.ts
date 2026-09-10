export function finishBackGesture(distance: number, velocity: number, width: number) {
  return distance > Math.min(120, width * .28) || (distance > 24 && velocity > 600);
}

export function projectedDetent(fraction: number, velocity: number, height: number, detents: readonly number[]) {
  const projected = fraction - velocity * 140 / Math.max(1, height);
  return detents.reduce((nearest, value) => Math.abs(value - projected) < Math.abs(nearest - projected) ? value : nearest);
}

// One vertical gesture can move from scrolling to resizing without jumping.
// Positive delta is a finger moving down. Consume list offset before collapsing;
// expand before scrolling when the finger moves up.
export function consumeSheetDrag(sheet: number, scroll: number, delta: number, minimum: number, maximum: number, scrollMaximum: number) {
  let remaining = delta;
  if (remaining > 0) {
    const consumed = Math.min(scroll, remaining);
    scroll -= consumed;
    remaining -= consumed;
    sheet = Math.max(minimum, sheet - remaining);
  } else {
    const consumed = Math.min(maximum - sheet, -remaining);
    sheet += consumed;
    remaining += consumed;
    scroll = Math.min(scrollMaximum, scroll - remaining);
  }
  return { sheet, scroll };
}
