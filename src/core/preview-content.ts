export type PreviewImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp"

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

export interface UnavailablePreview {
  readonly kind: "unavailable"
  readonly title: string
  readonly description: string
}

export type PreviewContent = ImagePreview | FilePreview | UrlPreview
export type PreviewOutcome = PreviewContent | UnavailablePreview
