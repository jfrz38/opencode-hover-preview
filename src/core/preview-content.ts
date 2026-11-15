import type { PreviewFailure } from "./preview-failure.js"

export const PREVIEW_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const

export type PreviewImageMime = (typeof PREVIEW_IMAGE_MIMES)[number]

export interface ImagePreview {
  readonly kind: "image"
  readonly title: string
  readonly location: string
  readonly mime: PreviewImageMime
  readonly data: Uint8Array
}

export interface FilePreview {
  readonly kind: "file"
  readonly title: string
  readonly path: string
  readonly body: string
  readonly language?: string
  readonly truncated: boolean
}

export interface UrlPreview {
  readonly kind: "url"
  readonly title: string
  readonly host: string
  readonly description?: string
  readonly url: string
}

export type PreviewContent = ImagePreview | FilePreview | UrlPreview
export type PreviewOutcome = PreviewContent | PreviewFailure
