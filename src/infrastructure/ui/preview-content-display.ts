import type { PreviewOutcome } from "../../core/preview-content.js"
import { previewFailureLines } from "./preview-failure-display.js"

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
      return previewFailureLines(content)
  }
}
