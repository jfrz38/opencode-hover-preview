import type { PreviewContent } from "../domain/preview-content.js"
import type { Size } from "../domain/overlay-position.js"

const FILE_BODY_HEIGHT = 8
const IMAGE_HEIGHT = 10
const BORDER_HEIGHT = 2
const DETAILS_HEADER_HEIGHT = 2

export interface PreviewOverlayLayout {
  readonly width: number
  readonly height: number
  readonly fileBodyHeight: number
  readonly imageHeight: number
}

export function calculatePreviewOverlayLayout(input: {
  readonly content: PreviewContent
  readonly lineCount: number
  readonly showDetails: boolean
  readonly viewport: Size
  readonly previewWidth: number
  readonly previewMinHeight: number
  readonly previewMaxHeight: number
}): PreviewOverlayLayout {
  const naturalHeight = (() => {
    if (input.showDetails) {
      if (input.content.kind === "file" || input.content.kind === "image") return 16
      return Math.max(6, input.lineCount + 4)
    }
    if (input.content.kind === "image") return IMAGE_HEIGHT + BORDER_HEIGHT
    if (input.content.kind === "file") {
      return FILE_BODY_HEIGHT + BORDER_HEIGHT + (input.content.truncated ? 1 : 0)
    }
    return Math.max(4, input.lineCount + BORDER_HEIGHT)
  })()

  const configuredHeight = Math.min(
    input.previewMaxHeight,
    Math.max(input.previewMinHeight, naturalHeight),
  )
  const height = Math.max(0, Math.min(configuredHeight, input.viewport.height))
  const detailsHeight = input.showDetails ? DETAILS_HEADER_HEIGHT : 0
  const availableMediaHeight = Math.max(
    0,
    height -
      BORDER_HEIGHT -
      detailsHeight -
      input.lineCount -
      (input.content.kind === "file" && input.content.truncated ? 1 : 0),
  )

  return {
    width: Math.max(0, Math.min(input.previewWidth, input.viewport.width)),
    height,
    fileBodyHeight:
      input.content.kind === "file" ? Math.min(FILE_BODY_HEIGHT, availableMediaHeight) : 0,
    imageHeight:
      input.content.kind === "image" ? Math.min(IMAGE_HEIGHT, availableMediaHeight) : 0,
  }
}
