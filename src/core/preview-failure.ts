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

export type StaticPreviewFailureReason = Exclude<PreviewFailure["reason"], "http-error">
