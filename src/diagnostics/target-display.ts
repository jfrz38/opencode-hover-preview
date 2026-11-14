import type { PreviewTarget } from "../domain/preview-target.js"

const DEFAULT_MAX_LENGTH = 52

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  if (maxLength <= 1) return "…".slice(0, maxLength)
  return `${value.slice(0, maxLength - 1)}…`
}

function sanitizedUrl(value: string): string {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    return value.split(/[?#]/u, 1)[0] ?? value
  }
}

export function formatPreviewTarget(target: PreviewTarget, maxLength = DEFAULT_MAX_LENGTH): string {
  const value = target.kind === "url" ? sanitizedUrl(target.value) : target.value
  return truncate(value, Math.max(0, maxLength))
}
