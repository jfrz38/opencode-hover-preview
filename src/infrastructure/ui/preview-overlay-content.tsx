import type { NativeImage, SyntaxStyle } from "@opentui/core"
import { For, Show } from "solid-js"
import type { PreviewOutcome } from "../../core/preview-content.js"
import type { PreviewTarget } from "../../core/preview-target.js"
import { FilePreviewBody } from "./file-preview-body.js"
import { ImagePreviewBody } from "./image-preview-body.js"
import { previewTextLines } from "./preview-content-display.js"

export function PreviewOverlayContent(props: {
  readonly content: PreviewOutcome
  readonly target: PreviewTarget
  readonly syntaxStyle: SyntaxStyle
  readonly showDetails: boolean
  readonly fileBodyHeight: number
  readonly imageWidth: number
  readonly imageHeight: number
  readonly onImageLoad: (image: NativeImage) => void
  readonly onImageError: () => void
}) {
  const image = () => (props.content.kind === "image" ? props.content : undefined)
  const file = () => (props.content.kind === "file" ? props.content : undefined)
  const lines = () => previewTextLines(props.content, props.showDetails)

  return (
    <>
      <Show when={props.showDetails}>
        <text fg="#ffffff">Preview</text>
        <text fg="#79d279">
          {props.target.kind} · {props.target.source}
        </text>
      </Show>
      <Show when={file()}>
        {(content) => (
          <FilePreviewBody
            content={content()}
            syntaxStyle={props.syntaxStyle}
            showDetails={props.showDetails}
            bodyHeight={props.fileBodyHeight}
          />
        )}
      </Show>
      <Show when={image()}>
        {(content) => (
          <ImagePreviewBody
            content={content()}
            showDetails={props.showDetails}
            width={props.imageWidth}
            height={props.imageHeight}
            onLoad={props.onImageLoad}
            onError={props.onImageError}
          />
        )}
      </Show>
      <Show when={file() === undefined && image() === undefined}>
        <For each={lines()}>{(line) => <text fg="#dddddd">{line}</text>}</For>
      </Show>
    </>
  )
}
