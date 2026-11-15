import type { PreviewContent } from "../domain/preview-content.js"
import type { Size } from "../domain/overlay-position.js"

const BORDER_HEIGHT = 2
const DETAILS_HEADER_HEIGHT = 2

export interface PreviewOverlayLayout {
  readonly width: number
  readonly height: number
  readonly fileBodyHeight: number
  readonly imageWidth: number
  readonly imageHeight: number
}

export interface PreviewDisplayOptions {
  readonly showDetails: boolean
  readonly width: number
  readonly height: number
  readonly image: {
    readonly allowUpscale: boolean
  }
}

export function imageCellSizeAtNativeScale(
  image: Size,
  terminal: Size,
  resolution: Size | null,
): Size | undefined {
  if (
    resolution === null ||
    image.width <= 0 ||
    image.height <= 0 ||
    terminal.width <= 0 ||
    terminal.height <= 0 ||
    resolution.width <= 0 ||
    resolution.height <= 0
  ) {
    return undefined
  }

  return {
    width: Math.max(1, Math.floor(image.width / (resolution.width / terminal.width))),
    height: Math.max(1, Math.floor(image.height / (resolution.height / terminal.height))),
  }
}

export function calculatePreviewOverlayLayout(input: {
  readonly content: PreviewContent
  readonly lineCount: number
  readonly viewport: Size
  readonly display: PreviewDisplayOptions
  readonly naturalImageSize?: Size
}): PreviewOverlayLayout {
  const width = Math.max(0, Math.min(input.display.width, input.viewport.width))
  const height = Math.max(0, Math.min(input.display.height, input.viewport.height))
  const detailsHeight = input.display.showDetails ? DETAILS_HEADER_HEIGHT : 0
  const availableImageWidth = Math.max(0, width - 4)
  const availableMediaHeight = Math.max(
    0,
    height -
      BORDER_HEIGHT -
      detailsHeight -
      input.lineCount -
      (input.content.kind === "file" && input.content.truncated ? 1 : 0),
  )
  const limitImageSize = input.content.kind === "image" && !input.display.image.allowUpscale
  const imageWidth = limitImageSize
    ? Math.min(availableImageWidth, input.naturalImageSize?.width ?? availableImageWidth)
    : availableImageWidth
  const imageHeight = limitImageSize
    ? Math.min(availableMediaHeight, input.naturalImageSize?.height ?? availableMediaHeight)
    : availableMediaHeight

  return {
    width,
    height,
    fileBodyHeight: input.content.kind === "file" ? availableMediaHeight : 0,
    imageWidth: input.content.kind === "image" ? imageWidth : 0,
    imageHeight: input.content.kind === "image" ? imageHeight : 0,
  }
}
