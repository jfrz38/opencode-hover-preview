import { usePlugin } from "@opencode/plugin/tui"
import { generateSyntax } from "@opencode/theme/tui"
import type { MouseEvent, NativeImage, Renderable, SyntaxStyle } from "@opentui/core"
import { createSignal, For, onCleanup, Show } from "solid-js"
import type { PreviewOutcome } from "../../core/preview-content.js"
import { canLoadPreview, type PreviewSources } from "../../core/preview-policy.js"
import type { PreviewTarget } from "../../core/preview-target.js"
import { inspectRenderable } from "../opentui/renderable-inspector.js"
import { observeRootMouse } from "../opentui/root-mouse-observer.js"
import { loadPreview } from "../preview-loader.js"
import { HoverDelay, systemTimerScheduler } from "./hover-delay.js"
import { positionOverlay, type Point } from "./overlay-position.js"
import { previewTextLines } from "./preview-content-display.js"
import { resolveFilePreviewFormat } from "./file-preview-format.js"
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

function FilePreviewBody(props: {
  readonly content: Extract<PreviewOutcome, { readonly kind: "file" }>
  readonly syntaxStyle: SyntaxStyle
  readonly showDetails: boolean
  readonly bodyHeight: number
}) {
  const body = () => {
    const format = resolveFilePreviewFormat(props.content.language)
    switch (format.kind) {
      case "markdown":
        return (
          <markdown
            content={props.content.body}
            syntaxStyle={props.syntaxStyle}
            conceal
            concealCode={false}
          />
        )
      case "code":
        return (
          <code
            content={props.content.body}
            filetype={format.filetype}
            syntaxStyle={props.syntaxStyle}
            drawUnstyledText
            wrapMode="word"
          />
        )
      case "plain":
        return <text fg="#dddddd">{props.content.body}</text>
    }
  }

  return (
    <>
      <For each={previewTextLines(props.content, props.showDetails)}>
        {(line, index) => <text fg={index() === 0 ? "#ffffff" : "#aaaaaa"}>{line}</text>}
      </For>
      <box height={props.bodyHeight} overflow="hidden">
        {body()}
      </box>
      <Show when={props.content.truncated}>
        <text fg="#aaaaaa">… truncated</text>
      </Show>
    </>
  )
}

export function PreviewOverlay(props: {
  readonly delayMs: number
  readonly workspace?: string
  readonly sources: PreviewSources
  readonly display: PreviewDisplayOptions
}) {
  const context = usePlugin()
  const syntaxStyle = generateSyntax(context.theme, context.renderer.nativeScene)
  const [visible, setVisible] = createSignal<PreviewState>()
  const [loadedImageSize, setLoadedImageSize] = createSignal<LoadedImageSize>()

  const session = new PreviewSession<HoverTarget>(
    (target, signal) => loadPreview(target, props.workspace, props.sources, signal),
    setVisible,
    (target) => {
      const originEnabled = target.kind === "url" ? props.sources.url : props.sources.file
      return originEnabled
        ? {
            kind: "unavailable",
            title: "Preview unavailable",
            description: "The preview could not be loaded.",
          }
        : undefined
    },
  )

  const showImageError = () => {
    const current = visible()
    if (current?.outcome.kind !== "image") return
    setVisible({
      ...current,
      outcome: {
        kind: "unavailable",
        title: "Image preview unavailable",
        description: "The terminal could not render this image.",
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
    if (target === undefined || !canLoadPreview(target, props.sources)) {
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
        const file = () => {
          const content = state().outcome
          return content?.kind === "file" ? content : undefined
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
            <Show when={props.display.showDetails}>
              <text fg="#ffffff">Preview</text>
              <text fg="#79d279">
                {state().candidate.target.kind} · {state().candidate.target.source}
              </text>
            </Show>
            <Show when={file()}>
              {(content) => (
                <FilePreviewBody
                  content={content()}
                  syntaxStyle={syntaxStyle}
                  showDetails={props.display.showDetails}
                  bodyHeight={layout().fileBodyHeight}
                />
              )}
            </Show>
            <Show when={image()}>
              {(content) => (
                <>
                  <For each={previewTextLines(content(), props.display.showDetails)}>
                    {(line, index) => (
                      <text fg={index() === 0 ? "#ffffff" : "#aaaaaa"}>{line}</text>
                    )}
                  </For>
                  <image
                    source={content().data}
                    width={layout().imageWidth}
                    height={layout().imageHeight}
                    fit="fit"
                    protocol="auto"
                    onLoad={(image) => captureImageSize(content().data, image)}
                    onError={showImageError}
                  />
                </>
              )}
            </Show>
            <Show when={file() === undefined && image() === undefined}>
              <For each={lines()}>{(line) => <text fg="#dddddd">{line}</text>}</For>
            </Show>
          </box>
        )
      }}
    </Show>
  )
}
