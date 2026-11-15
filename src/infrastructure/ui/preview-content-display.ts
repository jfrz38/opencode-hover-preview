import type { PreviewOutcome } from "../../core/preview-content.js"

export function previewTextLines(content: PreviewOutcome, showDetails: boolean): string[] {
  switch (content.kind) {
    case "image":
      return showDetails ? [content.title, content.location] : []
    case "url":
      return [
        content.title,
        ...(showDetails ? [content.host] : []),
        content.description,
        ...(showDetails ? [content.url] : []),
      ].filter((line): line is string => line !== undefined && line !== "")
    case "file":
      return showDetails ? [content.title, content.path] : []
    case "failure":
      return failureLines(content)
  }
}

function failureLines(failure: Extract<PreviewOutcome, { readonly kind: "failure" }>): string[] {
  switch (failure.reason) {
    case "workspace-unavailable":
      return ["File preview unavailable", "OpenCode has not provided a workspace directory."]
    case "invalid-file-target":
      return ["File preview unavailable", "The target is not a local file path."]
    case "outside-workspace":
      return ["File preview unavailable", "The file is outside the current workspace."]
    case "workspace-link-escape":
      return ["File preview unavailable", "The file resolves outside the current workspace."]
    case "not-a-file":
      return ["File preview unavailable", "The target is not a regular file."]
    case "file-unreadable":
      return ["File preview unavailable", "The file does not exist or cannot be read."]
    case "image-too-large":
      return ["Preview unavailable", "The image is too large to preview."]
    case "image-format-mismatch":
      return ["Preview unavailable", "The image format could not be validated."]
    case "image-content-mismatch":
      return ["URL preview unavailable", "The image content did not match its Content-Type."]
    case "unsupported-url":
      return ["URL preview unavailable", "Only HTTP and HTTPS URLs are supported."]
    case "url-credentials":
      return ["URL preview unavailable", "URLs with embedded credentials are not allowed."]
    case "nonstandard-port":
      return ["URL preview unavailable", "Only standard HTTP and HTTPS ports are allowed."]
    case "private-address":
      return ["URL preview unavailable", "Local and private network addresses are not allowed."]
    case "redirect-without-location":
      return ["URL preview unavailable", "The redirect did not include a destination."]
    case "too-many-redirects":
      return ["URL preview unavailable", "The URL redirected too many times."]
    case "http-error":
      return ["URL preview unavailable", `The server returned HTTP ${failure.status}.`]
    case "html-too-large":
      return ["URL preview unavailable", "The HTML document is too large to preview."]
    case "content-type-mismatch":
      return ["URL preview unavailable", "The response content did not match its Content-Type."]
    case "url-timeout":
      return ["URL preview unavailable", "The URL preview timed out."]
    case "load-failed":
      return ["Preview unavailable", "The preview could not be loaded."]
  }
}
