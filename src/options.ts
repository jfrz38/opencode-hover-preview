import { PreviewSourceSelection } from "./core/preview-policy.js"
import type { PreviewDisplayOptions } from "./infrastructure/ui/preview-overlay-layout.js"

export interface PluginOptions {
  readonly enabled: boolean
  readonly hoverDelayMs: number
  readonly hideCursorOnHover: boolean
  readonly sources: PreviewSourceSelection
  readonly display: PreviewDisplayOptions
}

const DEFAULT_HOVER_DELAY_MS = 500
const MAX_HOVER_DELAY_MS = 10_000
const DEFAULT_PREVIEW_WIDTH = 70
const DEFAULT_PREVIEW_HEIGHT = 16
const MIN_PREVIEW_WIDTH = 4
const MIN_PREVIEW_HEIGHT = 2

function positiveInteger(value: unknown, fallback: number, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback
  return Math.max(minimum, Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER))
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {}
}

export function parseOptions(input: Readonly<Record<string, unknown>>): PluginOptions {
  const requestedDelay =
    typeof input.hoverDelayMs === "number" && Number.isFinite(input.hoverDelayMs)
      ? input.hoverDelayMs
      : DEFAULT_HOVER_DELAY_MS
  const sources = record(input.sources)
  const display = record(input.display)
  const imageDisplay = record(display.image)
  return {
    enabled: input.enabled !== false && input.diagnostic !== false,
    hoverDelayMs: Math.max(0, Math.min(requestedDelay, MAX_HOVER_DELAY_MS)),
    hideCursorOnHover: input.hideCursorOnHover === true,
    sources: new PreviewSourceSelection({
      url: sources.url !== false,
      file: sources.file !== false,
      image: sources.image !== false,
    }),
    display: {
      showDetails: display.showDetails === true,
      width: positiveInteger(display.width, DEFAULT_PREVIEW_WIDTH, MIN_PREVIEW_WIDTH),
      height: positiveInteger(display.height, DEFAULT_PREVIEW_HEIGHT, MIN_PREVIEW_HEIGHT),
      image: {
        allowUpscale: imageDisplay.allowUpscale === true,
      },
    },
  }
}
