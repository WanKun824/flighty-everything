// Shared Apple Maps-style detents: summary, half, safe-area full screen.
export const SHEET_DETENTS = [.3, .57, .93];
export const SHEET_GAP = 8;

/** Clamp controls above a sheet; never squeeze controls over its heading. */
export function mapControlLayout(viewportHeight: number, fraction: number, safeTop = 0, controlsHeight = 148) {
  const sheetTop = viewportHeight * (1 - fraction) - SHEET_GAP;
  const availableBottom = sheetTop - SHEET_GAP;
  const top = Math.max(safeTop + 12, availableBottom - controlsHeight);
  return { top, hidden: fraction > .57 || top + controlsHeight > availableBottom };
}
