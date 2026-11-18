import { usePlugin } from "@opencode/plugin/tui"
import { generateSyntax } from "@opencode/theme/tui"
import type { MouseEvent, NativeImage, Renderable } from "@opentui/core"
import { createSignal, onCleanup, Show } from "solid-js"
import { type PreviewSourceSelection } from "../../core/preview-policy.js"
import type { PreviewTarget } from "../../core/preview-target.js"
import { hideCursorWhile } from "../opentui/cursor-visibility.js"
import { inspectRenderable } from "../opentui/renderable-inspector.js"
import { observeRootMouse } from "../opentui/root-mouse-observer.js"
import { loadPreview } from "../preview-loader.js"
import { HoverDelay, systemTimerScheduler } from "./hover-delay.js"
import { PreviewOverlayContent } from "./preview-overlay-content.js"
import { positionOverlay, type Point } from "./overlay-position.js"
import { previewTextLines } from "./preview-content-display.js"
import {
  calculatePreviewOverlayLayout,
  imageCellSizeAtNativeScale,
  type PreviewDisplayOptions,
} from "./preview-overlay-layout.js"
import { PreviewSession, type PreviewSessionState } from "./preview-session.js"

const OVERLAY_ID = "opencode-hover-preview.overlay"

interface HoverTarget {
  readonly pointer: Point
  readonly target: PreviewTarget
}

type PreviewState = PreviewSessionState<HoverTarget>

interface LoadedImageSize {
  readonly data: Uint8Array
  readonly naturalSize?: {
    readonly width: number
    readonly height: number
  }
}

function isInsideOverlay(renderable: Renderable): boolean {
  let current: Renderable | null = renderable
  while (current !== null) {
    if (current.id === OVERLAY_ID) return true
    current = current.parent
  }
  return false
}

export function PreviewOverlay(props: {
  readonly delayMs: number
  readonly hideCursorOnHover: boolean
  readonly workspace?: string
  readonly sources: PreviewSourceSelection
  readonly display: PreviewDisplayOptions
}) {
  const context = usePlugin()
  const syntaxStyle = generateSyntax(context.theme, context.renderer.nativeScene)
  const [visible, setVisible] = createSignal<PreviewState>()
  const [loadedImageSize, setLoadedImageSize] = createSignal<LoadedImageSize>()

  const session = new PreviewSession<HoverTarget>(
    (target, signal) => loadPreview(target, props.workspace, props.sources, signal),
    setVisible,
  )

  const showImageError = () => {
    const current = visible()
    if (current?.outcome.kind !== "image") return
    setVisible({
      ...current,
      outcome: {
        kind: "failure",
        reason: "load-failed",
      },
    })
  }

  const captureImageSize = (data: Uint8Array, image: NativeImage) => {
    const naturalSize = imageCellSizeAtNativeScale(
      { width: image.width, height: image.height },
      { width: context.renderer.terminalWidth, height: context.renderer.terminalHeight },
      context.renderer.resolution,
    )
    setLoadedImageSize({
      data,
      ...(naturalSize === undefined ? {} : { naturalSize }),
    })
  }

  const delay = new HoverDelay<HoverTarget>(
    props.delayMs,
    systemTimerScheduler,
    (candidate) => session.show(candidate.value),
    () => session.hide(),
  )

  const stopHidingCursor = props.hideCursorOnHover
    ? hideCursorWhile(context.renderer, () => visible() !== undefined)
    : undefined

  const stopObserving = observeRootMouse(context.renderer.root, (event: MouseEvent) => {
    const renderable = event.target
    if (renderable === null) {
      delay.leave()
      return
    }
    if (isInsideOverlay(renderable)) return
    if (event.type === "out" || event.type === "scroll") {
      delay.leave()
      return
    }
    if (event.type !== "over" && event.type !== "move") return

    const target = inspectRenderable(renderable, { x: event.x, y: event.y }).target
    if (target === undefined || !props.sources.canLoad(target)) {
      delay.leave()
      return
    }

    delay.enter({
      key: `${renderable.num}:${target.kind}:${target.value}`,
      value: { pointer: { x: event.x, y: event.y }, target },
    })
  })

  onCleanup(() => {
    delay.dispose()
    session.dispose()
    stopHidingCursor?.()
    stopObserving()
    void context.renderer.idle().then(() => syntaxStyle.destroy())
  })

  return (
    <Show when={visible()}>
      {(state) => {
        const lines = () => {
          return previewTextLines(state().outcome, props.display.showDetails)
        }
        const image = () => {
          const content = state().outcome
          return content?.kind === "image" ? content : undefined
        }
        const layout = () => {
          const loaded = loadedImageSize()
          return calculatePreviewOverlayLayout({
            content: state().outcome,
            lineCount: lines().length,
            viewport: { width: context.renderer.width, height: context.renderer.height },
            display: props.display,
            ...(image()?.data === loaded?.data &&
            loaded?.naturalSize !== undefined
              ? { naturalImageSize: loaded.naturalSize }
              : {}),
          })
        }
        const position = () =>
          positionOverlay(
            state().candidate.pointer,
            { width: context.renderer.width, height: context.renderer.height },
            { width: layout().width, height: layout().height },
          )

        return (
          <box
            id={OVERLAY_ID}
            position="absolute"
            left={position().x}
            top={position().y}
            width={layout().width}
            height={layout().height}
            zIndex={10_000}
            border
            borderStyle="rounded"
            borderColor="#5ea1ff"
            backgroundColor="#1b1b1b"
            paddingX={1}
            flexDirection="column"
            overflow="hidden"
          >
            <PreviewOverlayContent
              content={state().outcome}
              target={state().candidate.target}
              syntaxStyle={syntaxStyle}
              showDetails={props.display.showDetails}
              fileBodyHeight={layout().fileBodyHeight}
              imageWidth={layout().imageWidth}
              imageHeight={layout().imageHeight}
              onImageLoad={(loaded) => {
                const content = state().outcome
                if (content.kind === "image") captureImageSize(content.data, loaded)
              }}
              onImageError={showImageError}
            />
          </box>
        )
      }}
    </Show>
  )
}
