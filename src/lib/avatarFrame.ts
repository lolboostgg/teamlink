import type { CSSProperties } from "react";

/**
 * How a profile picture is framed: the focal point in percent of the image,
 * plus a zoom in percent. Stored per teammate (see prisma/schema.prisma) and
 * set by dragging the picture around in the profile editor.
 */
export interface AvatarFrame {
  avatarFocusX?: number | null;
  avatarFocusY?: number | null;
  avatarZoom?: number | null;
}

export const DEFAULT_FRAME = { focusX: 50, focusY: 50, zoom: 100 } as const;
export const MIN_ZOOM = 100;
export const MAX_ZOOM = 300;

export function clampPercent(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function readFrame(row: AvatarFrame | null | undefined) {
  return {
    focusX: clampPercent(row?.avatarFocusX ?? DEFAULT_FRAME.focusX),
    focusY: clampPercent(row?.avatarFocusY ?? DEFAULT_FRAME.focusY),
    zoom: clampPercent(row?.avatarZoom ?? DEFAULT_FRAME.zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

/**
 * The framing, as styles for a `object-fit: cover` image.
 *
 * `object-position` pans within whatever the cover crop already hides, and
 * scaling *around the same point* extends that pan to the rest of the image:
 * at 0% the left edge stays put and everything else grows out of view, at
 * 100% the right edge does. Together they reach every part of the picture in
 * any frame shape, which is what lets one saved focal point serve both the
 * round dashboard avatar and the tall roster card.
 */
export function avatarFrameStyle(row: AvatarFrame | null | undefined): CSSProperties {
  const { focusX, focusY, zoom } = readFrame(row);
  const position = `${focusX}% ${focusY}%`;
  return {
    objectPosition: position,
    transform: `scale(${zoom / 100})`,
    transformOrigin: position,
  };
}
