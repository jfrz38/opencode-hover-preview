import type { MouseEvent, Renderable } from "@opentui/core"

export type MouseObservation = (event: MouseEvent) => void

/**
 * Experimental host adapter.
 *
 * OpenTUI exposes `processMouseEvent`, but OpenCode does not expose an
 * additive global mouse hook for plugins. Wrapping the root dispatcher lets
 * the spike observe host content while preserving the original call. This is
 * intentionally isolated because it is not a stable OpenCode plugin contract.
 */
export function observeRootMouse(root: Renderable, observe: MouseObservation): () => void {
  const original = root.processMouseEvent
  const wrapped = function processMouseEvent(this: Renderable, event: MouseEvent): void {
    observe(event)
    original.call(this, event)
  }

  root.processMouseEvent = wrapped

  return () => {
    if (root.processMouseEvent === wrapped) root.processMouseEvent = original
  }
}
