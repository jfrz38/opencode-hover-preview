export interface PluginOptions {
  readonly diagnostic: boolean
  readonly hoverDelayMs: number
}

const DEFAULT_HOVER_DELAY_MS = 500
const MAX_HOVER_DELAY_MS = 10_000

export function parseOptions(input: Readonly<Record<string, unknown>>): PluginOptions {
  const requestedDelay = typeof input.hoverDelayMs === "number" ? input.hoverDelayMs : DEFAULT_HOVER_DELAY_MS

  return {
    diagnostic: input.diagnostic !== false,
    hoverDelayMs: Math.max(0, Math.min(requestedDelay, MAX_HOVER_DELAY_MS)),
  }
}
