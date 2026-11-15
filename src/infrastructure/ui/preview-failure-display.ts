import type {
  PreviewFailure,
  StaticPreviewFailureReason,
} from "../../core/preview-failure.js"

type FailureMessage = readonly [title: string, description: string]

const FAILURE_MESSAGES = {
  "workspace-unavailable": [
    "File preview unavailable",
    "OpenCode has not provided a workspace directory.",
  ],
  "invalid-file-target": ["File preview unavailable", "The target is not a local file path."],
  "outside-workspace": ["File preview unavailable", "The file is outside the current workspace."],
  "workspace-link-escape": [
    "File preview unavailable",
    "The file resolves outside the current workspace.",
  ],
  "not-a-file": ["File preview unavailable", "The target is not a regular file."],
  "file-unreadable": ["File preview unavailable", "The file does not exist or cannot be read."],
  "image-too-large": ["Preview unavailable", "The image is too large to preview."],
  "image-format-mismatch": ["Preview unavailable", "The image format could not be validated."],
  "image-content-mismatch": [
    "URL preview unavailable",
    "The image content did not match its Content-Type.",
  ],
  "unsupported-url": ["URL preview unavailable", "Only HTTP and HTTPS URLs are supported."],
  "url-credentials": ["URL preview unavailable", "URLs with embedded credentials are not allowed."],
  "nonstandard-port": ["URL preview unavailable", "Only standard HTTP and HTTPS ports are allowed."],
  "private-address": ["URL preview unavailable", "Local and private network addresses are not allowed."],
  "redirect-without-location": [
    "URL preview unavailable",
    "The redirect did not include a destination.",
  ],
  "too-many-redirects": ["URL preview unavailable", "The URL redirected too many times."],
  "html-too-large": ["URL preview unavailable", "The HTML document is too large to preview."],
  "content-type-mismatch": [
    "URL preview unavailable",
    "The response content did not match its Content-Type.",
  ],
  "url-timeout": ["URL preview unavailable", "The URL preview timed out."],
  "load-failed": ["Preview unavailable", "The preview could not be loaded."],
} satisfies Record<StaticPreviewFailureReason, FailureMessage>

export function previewFailureLines(failure: PreviewFailure): string[] {
  if (failure.reason === "http-error") {
    return ["URL preview unavailable", `The server returned HTTP ${failure.status}.`]
  }

  return [...FAILURE_MESSAGES[failure.reason]]
}
