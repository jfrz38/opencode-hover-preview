import type { CliRenderer } from "@opentui/core"

type CursorRenderer = Pick<
  CliRenderer,
  "getCursorState" | "setCursorPosition" | "addPostProcessFn" | "removePostProcessFn"
>

/**
 * Experimental host adapter. Post-process hooks run after the editor paints
 * the caret, so suppressing it there avoids restoring a stale position.
 * Not a stable OpenCode plugin contract.
 */
export function hideCursorWhile(renderer: CursorRenderer, isActive: () => boolean): () => void {
  const suppressCaret = () => {
    if (!isActive()) return
    const { x, y } = renderer.getCursorState()
    renderer.setCursorPosition(x, y, false)
  }

  renderer.addPostProcessFn(suppressCaret)
  return () => renderer.removePostProcessFn(suppressCaret)
}
