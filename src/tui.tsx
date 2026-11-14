import { Plugin, usePlugin } from "@opencode/plugin/tui"
import type { MouseEvent } from "@opentui/core"
import { createSignal, onCleanup, Show } from "solid-js"
import { inspectRenderable, type RenderableDiagnostic } from "./diagnostics/renderable-inspector.js"
import { observeRootMouse } from "./diagnostics/root-mouse-observer.js"
import { formatPreviewTarget } from "./diagnostics/target-display.js"
import { HoverDelay, systemTimerScheduler } from "./domain/hover-delay.js"
import { positionOverlay, type Point } from "./domain/overlay-position.js"
import { parseOptions } from "./options.js"

const OVERLAY_WIDTH = 60
const OVERLAY_HEIGHT = 8
const OVERLAY_ID = "opencode-link-preview.diagnostic"

interface DiagnosticState {
  readonly pointer: Point
  readonly diagnostic: RenderableDiagnostic
}

function DiagnosticOverlay(props: { readonly delayMs: number }) {
  const context = usePlugin()
  const [visible, setVisible] = createSignal<DiagnosticState>()
  const delay = new HoverDelay<DiagnosticState>(
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
    const key = `${target.num}:${diagnostic.target.kind}:${diagnostic.target.value}`
    delay.enter({
      key,
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
            <text fg={diagnostic().target ? "#79d279" : "#e7b75f"}>
              target: {diagnostic().target?.kind ?? "not resolved"} · {diagnostic().target?.source ?? "none"}
            </text>
            <text fg="#ffffff">
              destination: {destination()}
            </text>
            <text fg="#bbbbbb">resolution: {diagnostic().resolution}</text>
          </box>
        )
      }}
    </Show>
  )
}

export default Plugin.define({
  id: "opencode-link-preview",
  setup(context) {
    const options = parseOptions(context.options)
    if (!options.diagnostic) return

    return context.ui.slot({
      append: "app",
      render: () => <DiagnosticOverlay delayMs={options.hoverDelayMs} />,
    })
  },
})
