import { usePlugin } from "@opencode/plugin/tui"
import { generateSyntax } from "@opencode/theme/tui"
import type { MouseEvent, Renderable, SyntaxStyle } from "@opentui/core"
import { createSignal, For, onCleanup, Show } from "solid-js"
import type { PreviewContent } from "../domain/preview-content.js"
import { HoverDelay, systemTimerScheduler } from "../domain/hover-delay.js"
import { positionOverlay, type Point } from "../domain/overlay-position.js"
import type { PreviewTarget } from "../domain/preview-target.js"
import { inspectRenderable } from "../opentui/renderable-inspector.js"
import { observeRootMouse } from "../opentui/root-mouse-observer.js"
import { canLoadPreview, loadPreview, type PreviewSources } from "../preview/load-preview.js"
import { PreviewCache } from "../preview/preview-cache.js"
import { previewTextLines } from "./preview-content-display.js"
import { resolveFilePreviewFormat } from "./file-preview-format.js"
import {
  calculatePreviewOverlayLayout,
  type PreviewDisplayOptions,
} from "./preview-overlay-layout.js"

const OVERLAY_ID = "opencode-hover-preview.overlay"

interface HoverTarget {
  readonly pointer: Point
  readonly target: PreviewTarget
}

interface PreviewState extends HoverTarget {
  readonly content: PreviewContent
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
  readonly content: Extract<PreviewContent, { readonly kind: "file" }>
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
  const cache = new PreviewCache()
  const [visible, setVisible] = createSignal<PreviewState>()
  let activeLoad: AbortController | undefined
  let generation = 0

  const hide = () => {
    generation++
    activeLoad?.abort()
    activeLoad = undefined
    setVisible(undefined)
  }

  const showImageError = () => {
    const current = visible()
    if (current?.content?.kind !== "image") return
    setVisible({
      ...current,
      content: {
        kind: "unavailable",
        title: "Image preview unavailable",
        description: "The terminal could not render this image.",
      },
    })
  }

  const showPreview = (candidate: HoverTarget) => {
    const currentGeneration = ++generation
    activeLoad?.abort()
    activeLoad = undefined

    const key = `${candidate.target.kind}:${candidate.target.value}`
    const cached = cache.get(key)
    if (cached !== undefined) {
      setVisible({ ...candidate, content: cached })
      return
    }

    const controller = new AbortController()
    activeLoad = controller
    void loadPreview(
      candidate.target,
      props.workspace,
      props.sources,
      controller.signal,
    )
      .then((content) => {
        if (controller.signal.aborted || currentGeneration !== generation) return
        if (content === undefined) {
          setVisible(undefined)
          return
        }
        cache.set(key, content)
        setVisible({ ...candidate, content })
      })
      .catch(() => {
        if (controller.signal.aborted || currentGeneration !== generation) return
        const originEnabled =
          candidate.target.kind === "url" ? props.sources.url : props.sources.file
        if (!originEnabled) {
          setVisible(undefined)
          return
        }
        setVisible({
          ...candidate,
          content: {
            kind: "unavailable",
            title: "Preview unavailable",
            description: "The preview could not be loaded.",
          },
        })
      })
      .finally(() => {
        if (activeLoad === controller) activeLoad = undefined
      })
  }

  const delay = new HoverDelay<HoverTarget>(
    props.delayMs,
    systemTimerScheduler,
    (candidate) => showPreview(candidate.value),
    hide,
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
    stopObserving()
    void context.renderer.idle().then(() => syntaxStyle.destroy())
  })

  return (
    <Show when={visible()}>
      {(state) => {
        const lines = () => {
          return previewTextLines(state().content, props.display.showDetails)
        }
        const image = () => {
          const content = state().content
          return content?.kind === "image" ? content : undefined
        }
        const file = () => {
          const content = state().content
          return content?.kind === "file" ? content : undefined
        }
        const layout = () =>
          calculatePreviewOverlayLayout({
            content: state().content,
            lineCount: lines().length,
            viewport: { width: context.renderer.width, height: context.renderer.height },
            display: props.display,
          })
        const position = () =>
          positionOverlay(
            state().pointer,
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
                {state().target.kind} · {state().target.source}
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
                    width={Math.max(0, layout().width - 4)}
                    height={layout().imageHeight}
                    fit="fit"
                    protocol="auto"
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
