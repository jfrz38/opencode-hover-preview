import { usePlugin } from "@opencode/plugin/tui"
import type { MouseEvent } from "@opentui/core"
import { createSignal, For, onCleanup, Show } from "solid-js"
import type { PreviewContent } from "../domain/preview-content.js"
import { HoverDelay, systemTimerScheduler } from "../domain/hover-delay.js"
import { positionOverlay, type Point } from "../domain/overlay-position.js"
import type { PreviewTarget } from "../domain/preview-target.js"
import { inspectRenderable } from "../opentui/renderable-inspector.js"
import { observeRootMouse } from "../opentui/root-mouse-observer.js"
import { loadPreview, type PreviewOptions } from "../preview/load-preview.js"
import { PreviewCache } from "../preview/preview-cache.js"

const OVERLAY_WIDTH = 70
const MAX_OVERLAY_HEIGHT = 16
const IMAGE_HEIGHT = 10
const OVERLAY_ID = "opencode-link-preview.overlay"

interface HoverTarget {
  readonly pointer: Point
  readonly target: PreviewTarget
}

interface PreviewState extends HoverTarget {
  readonly status: "loading" | "ready"
  readonly content?: PreviewContent
}

function contentLines(content: PreviewContent): string[] {
  switch (content.kind) {
    case "image":
      return [content.title, content.location]
    case "url":
      return [content.title, content.host, content.description, content.url].filter(
        (line): line is string => line !== undefined && line !== "",
      )
    case "file": {
      const body = content.body.split("\n").slice(0, 8)
      if (content.truncated) body.push("… truncated")
      return [content.title, content.path, ...body]
    }
    case "unavailable":
      return [content.title, content.description]
  }
}

export function PreviewOverlay(props: {
  readonly delayMs: number
  readonly workspace?: string
  readonly previewOptions: PreviewOptions
}) {
  const context = usePlugin()
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
    setVisible({ ...candidate, status: "loading" })

    const key = `${candidate.target.kind}:${candidate.target.value}`
    const cached = cache.get(key)
    if (cached !== undefined) {
      setVisible({ ...candidate, status: "ready", content: cached })
      return
    }

    const controller = new AbortController()
    activeLoad = controller
    void loadPreview(
      candidate.target,
      props.workspace,
      props.previewOptions,
      controller.signal,
    )
      .then((content) => {
        if (controller.signal.aborted || currentGeneration !== generation) return
        cache.set(key, content)
        setVisible({ ...candidate, status: "ready", content })
      })
      .catch(() => {
        if (controller.signal.aborted || currentGeneration !== generation) return
        setVisible({
          ...candidate,
          status: "ready",
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
    if (renderable.id === OVERLAY_ID) return
    if (event.type === "out" || event.type === "scroll") {
      delay.leave()
      return
    }
    if (event.type !== "over" && event.type !== "move") return

    const target = inspectRenderable(renderable, { x: event.x, y: event.y }).target
    if (target === undefined) {
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
  })

  return (
    <Show when={visible()}>
      {(state) => {
        const lines = () => {
          const content = state().content
          return content === undefined ? ["Loading preview…"] : contentLines(content)
        }
        const image = () => {
          const content = state().content
          return content?.kind === "image" ? content : undefined
        }
        const overlayHeight = () =>
          image() === undefined
            ? Math.min(MAX_OVERLAY_HEIGHT, Math.max(6, lines().length + 4))
            : MAX_OVERLAY_HEIGHT
        const position = () =>
          positionOverlay(
            state().pointer,
            { width: context.renderer.width, height: context.renderer.height },
            { width: OVERLAY_WIDTH, height: overlayHeight() },
          )

        return (
          <box
            id={OVERLAY_ID}
            position="absolute"
            left={position().x}
            top={position().y}
            width={OVERLAY_WIDTH}
            height={overlayHeight()}
            zIndex={10_000}
            border
            borderStyle="rounded"
            borderColor="#5ea1ff"
            backgroundColor="#1b1b1b"
            paddingX={1}
            flexDirection="column"
            overflow="hidden"
          >
            <text fg="#ffffff">Preview</text>
            <text fg="#79d279">
              {state().target.kind} · {state().target.source}
            </text>
            <Show
              when={image()}
              fallback={<For each={lines()}>{(line) => <text fg="#dddddd">{line}</text>}</For>}
            >
              {(content) => (
                <>
                  <text fg="#ffffff">{content().title}</text>
                  <text fg="#aaaaaa">{content().location}</text>
                  <image
                    source={content().data}
                    width={OVERLAY_WIDTH - 4}
                    height={IMAGE_HEIGHT}
                    fit="fit"
                    protocol="auto"
                    onError={showImageError}
                  />
                </>
              )}
            </Show>
          </box>
        )
      }}
    </Show>
  )
}
