import { usePlugin } from "@opencode/plugin/tui"
import type { MouseEvent } from "@opentui/core"
import { createSignal, onCleanup, Show } from "solid-js"
import { HoverDelay, systemTimerScheduler } from "../domain/hover-delay.js"
import { positionOverlay, type Point } from "../domain/overlay-position.js"
import { inspectRenderable, type RenderableDiagnostic } from "../opentui/renderable-inspector.js"
import { observeRootMouse } from "../opentui/root-mouse-observer.js"
import { formatPreviewTarget } from "./target-display.js"

const OVERLAY_WIDTH = 60
const OVERLAY_HEIGHT = 8
const OVERLAY_ID = "opencode-link-preview.overlay"

interface PreviewState {
  readonly pointer: Point
  readonly diagnostic: RenderableDiagnostic
}

export function PreviewOverlay(props: { readonly delayMs: number }) {
  const context = usePlugin()
  const [visible, setVisible] = createSignal<PreviewState>()
  const delay = new HoverDelay<PreviewState>(
    props.delayMs,
    systemTimerScheduler,
    (candidate) => setVisible(candidate.value),
    () => setVisible(undefined),
  )

  const stopObserving = observeRootMouse(context.renderer.root, (event: MouseEvent) => {
    const target = event.target
    if (target === null) {
      delay.leave()
      return
    }

    if (target.id === OVERLAY_ID) return

    if (event.type === "out" || event.type === "scroll") {
      delay.leave()
      return
    }

    if (event.type !== "over" && event.type !== "move") return

    const diagnostic = inspectRenderable(target, { x: event.x, y: event.y })
    if (diagnostic.target === undefined) {
      delay.leave()
      return
    }

    delay.enter({
      key: `${target.num}:${diagnostic.target.kind}:${diagnostic.target.value}`,
      value: { pointer: { x: event.x, y: event.y }, diagnostic },
    })
  })

  onCleanup(() => {
    delay.dispose()
    stopObserving()
  })

  return (
    <Show when={visible()}>
      {(state) => {
        const position = () =>
          positionOverlay(
            state().pointer,
            { width: context.renderer.width, height: context.renderer.height },
            { width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT },
          )
        const diagnostic = () => state().diagnostic
        const destination = () => {
          const target = diagnostic().target
          return target === undefined ? "" : formatPreviewTarget(target)
        }

        return (
          <box
            id={OVERLAY_ID}
            position="absolute"
            left={position().x}
            top={position().y}
            width={OVERLAY_WIDTH}
            height={OVERLAY_HEIGHT}
            zIndex={10_000}
            border
            borderStyle="rounded"
            borderColor="#5ea1ff"
            backgroundColor="#1b1b1b"
            paddingX={1}
            flexDirection="column"
          >
            <text fg="#ffffff">Link preview diagnostic</text>
            <text fg="#bbbbbb">
              {diagnostic().className} · {diagnostic().id || "(no id)"}
            </text>
            <text fg="#bbbbbb">
              hit: {diagnostic().bounds.width}×{diagnostic().bounds.height} at {diagnostic().bounds.x},
              {diagnostic().bounds.y}
            </text>
            <text fg="#79d279">
              target: {diagnostic().target?.kind} · {diagnostic().target?.source}
            </text>
            <text fg="#ffffff">destination: {destination()}</text>
            <text fg="#bbbbbb">resolution: {diagnostic().resolution}</text>
          </box>
        )
      }}
    </Show>
  )
}
