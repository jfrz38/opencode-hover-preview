import type { PreviewContent } from "../domain/preview-content.js"
import type { Size } from "../domain/overlay-position.js"

const BORDER_HEIGHT = 2
const DETAILS_HEADER_HEIGHT = 2

export interface PreviewOverlayLayout {
  readonly width: number
  readonly height: number
  readonly fileBodyHeight: number
  readonly imageHeight: number
}

export interface PreviewDisplayOptions {
  readonly showDetails: boolean
  readonly width: number
  readonly height: number
}

export function calculatePreviewOverlayLayout(input: {
  readonly content: PreviewContent
  readonly lineCount: number
  readonly viewport: Size
  readonly display: PreviewDisplayOptions
}): PreviewOverlayLayout {
  const height = Math.max(0, Math.min(input.display.height, input.viewport.height))
  const detailsHeight = input.display.showDetails ? DETAILS_HEADER_HEIGHT : 0
  const availableMediaHeight = Math.max(
    0,
    height -
      BORDER_HEIGHT -
      detailsHeight -
      input.lineCount -
      (input.content.kind === "file" && input.content.truncated ? 1 : 0),
  )

  return {
    width: Math.max(0, Math.min(input.display.width, input.viewport.width)),
    height,
    fileBodyHeight: input.content.kind === "file" ? availableMediaHeight : 0,
    imageHeight: input.content.kind === "image" ? availableMediaHeight : 0,
  }
}
