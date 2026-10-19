// Pure maths for the image zoom viewer and the 360° spin viewer.
export const clampScale = (s: number, min = 1, max = 5) => Math.min(max, Math.max(min, s));

/** Keeps a zoomed image from being dragged out of view. */
export function clampPan(scale: number, x: number, y: number, w: number, h: number) {
  const mx = ((scale - 1) * w) / 2, my = ((scale - 1) * h) / 2;
  return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) };
}

/** Dragging one full width turns the product through all n frames. */
export function frameFromDrag(start: number, dx: number, width: number, n: number): number {
  if (n <= 0 || width <= 0) return 0;
  const moved = Math.round(dx / (width / n));
  return (((start - moved) % n) + n) % n;
}
