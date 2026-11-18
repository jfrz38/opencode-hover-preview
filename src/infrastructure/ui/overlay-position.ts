export interface Point {
  readonly x: number
  readonly y: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export function positionOverlay(pointer: Point, viewport: Size, overlay: Size): Point {
  const preferredX = pointer.x + 2
  const preferredY = pointer.y + 1
  const maxX = Math.max(0, viewport.width - overlay.width)
  const maxY = Math.max(0, viewport.height - overlay.height)

  return {
    x: Math.max(0, Math.min(preferredX, maxX)),
    y: Math.max(0, Math.min(preferredY, maxY)),
  }
}
