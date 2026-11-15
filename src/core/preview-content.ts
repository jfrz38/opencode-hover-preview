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

export type PreviewFailure =
  | { readonly kind: "failure"; readonly reason: "workspace-unavailable" }
  | { readonly kind: "failure"; readonly reason: "invalid-file-target" }
  | { readonly kind: "failure"; readonly reason: "outside-workspace" }
  | { readonly kind: "failure"; readonly reason: "workspace-link-escape" }
  | { readonly kind: "failure"; readonly reason: "not-a-file" }
  | { readonly kind: "failure"; readonly reason: "file-unreadable" }
  | { readonly kind: "failure"; readonly reason: "image-too-large" }
  | { readonly kind: "failure"; readonly reason: "image-format-mismatch" }
  | { readonly kind: "failure"; readonly reason: "image-content-mismatch" }
  | { readonly kind: "failure"; readonly reason: "unsupported-url" }
  | { readonly kind: "failure"; readonly reason: "url-credentials" }
  | { readonly kind: "failure"; readonly reason: "nonstandard-port" }
  | { readonly kind: "failure"; readonly reason: "private-address" }
  | { readonly kind: "failure"; readonly reason: "redirect-without-location" }
  | { readonly kind: "failure"; readonly reason: "too-many-redirects" }
  | { readonly kind: "failure"; readonly reason: "http-error"; readonly status: number }
  | { readonly kind: "failure"; readonly reason: "html-too-large" }
  | { readonly kind: "failure"; readonly reason: "content-type-mismatch" }
  | { readonly kind: "failure"; readonly reason: "url-timeout" }
  | { readonly kind: "failure"; readonly reason: "load-failed" }

export type PreviewContent = ImagePreview | FilePreview | UrlPreview
export type PreviewOutcome = PreviewContent | PreviewFailure
