import type { PreviewContent } from "../domain/preview-content.js"

export function previewTextLines(content: PreviewContent, showDetails: boolean): string[] {
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
    case "unavailable":
      return [content.title, content.description]
  }
}
