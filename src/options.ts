export interface PluginOptions {
  readonly enabled: boolean
  readonly hoverDelayMs: number
  readonly urlPreview: boolean
  readonly filePreview: boolean
}

const DEFAULT_HOVER_DELAY_MS = 500
const MAX_HOVER_DELAY_MS = 10_000

export function parseOptions(input: Readonly<Record<string, unknown>>): PluginOptions {
  const requestedDelay = typeof input.hoverDelayMs === "number" ? input.hoverDelayMs : DEFAULT_HOVER_DELAY_MS

  return {
    enabled: input.enabled !== false && input.diagnostic !== false,
    hoverDelayMs: Math.max(0, Math.min(requestedDelay, MAX_HOVER_DELAY_MS)),
    urlPreview: input.urlPreview !== false,
    filePreview: input.filePreview !== false,
  }
}
