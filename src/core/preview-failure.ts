export type FilePreviewFailureReason =
  | "workspace-unavailable"
  | "invalid-file-target"
  | "outside-workspace"
  | "workspace-link-escape"
  | "not-a-file"
  | "file-unreadable"

export type ImagePreviewFailureReason =
  | "image-too-large"
  | "image-format-mismatch"
  | "image-content-mismatch"

export type UrlPreviewFailureReason =
  | "unsupported-url"
  | "url-credentials"
  | "nonstandard-port"
  | "private-address"
  | "redirect-without-location"
  | "too-many-redirects"
  | "html-too-large"
  | "content-type-mismatch"
  | "url-timeout"

type FailureFor<Reason extends string> = Reason extends unknown
  ? { readonly kind: "failure"; readonly reason: Reason }
  : never

export type HttpPreviewFailure = {
  readonly kind: "failure"
  readonly reason: "http-error"
  readonly status: number
}

export type PreviewFailure =
  | FailureFor<FilePreviewFailureReason>
  | FailureFor<ImagePreviewFailureReason>
  | FailureFor<UrlPreviewFailureReason>
  | FailureFor<"load-failed">
  | HttpPreviewFailure

export type StaticPreviewFailureReason = Exclude<PreviewFailure["reason"], "http-error">
