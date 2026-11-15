export interface PluginOptions {
  readonly enabled: boolean
  readonly hoverDelayMs: number
  readonly urlPreview: boolean
  readonly filePreview: boolean
  readonly imagePreview: boolean
  readonly showDetails: boolean
  readonly previewWidth: number
  readonly previewMinHeight: number
  readonly previewMaxHeight: number
}

const DEFAULT_HOVER_DELAY_MS = 500
const MAX_HOVER_DELAY_MS = 10_000
const DEFAULT_PREVIEW_WIDTH = 70
const DEFAULT_PREVIEW_MIN_HEIGHT = 4
const DEFAULT_PREVIEW_MAX_HEIGHT = 16
const MIN_PREVIEW_WIDTH = 4
const MIN_PREVIEW_HEIGHT = 2

function positiveInteger(value: unknown, fallback: number, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback
  return Math.max(minimum, Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER))
}

export function parseOptions(input: Readonly<Record<string, unknown>>): PluginOptions {
  const requestedDelay = typeof input.hoverDelayMs === "number" ? input.hoverDelayMs : DEFAULT_HOVER_DELAY_MS
  const previewMinHeight = positiveInteger(
    input.previewMinHeight,
    DEFAULT_PREVIEW_MIN_HEIGHT,
    MIN_PREVIEW_HEIGHT,
  )
  const requestedPreviewMaxHeight = positiveInteger(
    input.previewMaxHeight,
    DEFAULT_PREVIEW_MAX_HEIGHT,
    MIN_PREVIEW_HEIGHT,
  )

  return {
    enabled: input.enabled !== false && input.diagnostic !== false,
    hoverDelayMs: Math.max(0, Math.min(requestedDelay, MAX_HOVER_DELAY_MS)),
    urlPreview: input.urlPreview !== false,
    filePreview: input.filePreview !== false,
    imagePreview: input.imagePreview !== false,
    showDetails: input.showDetails === true,
    previewWidth: positiveInteger(input.previewWidth, DEFAULT_PREVIEW_WIDTH, MIN_PREVIEW_WIDTH),
    previewMinHeight,
    previewMaxHeight: Math.max(previewMinHeight, requestedPreviewMaxHeight),
  }
}
