import type { NativeImage } from "@opentui/core"
import { For } from "solid-js"
import type { PreviewOutcome } from "../../core/preview-content.js"
import { previewTextLines } from "./preview-content-display.js"

export function ImagePreviewBody(props: {
  readonly content: Extract<PreviewOutcome, { readonly kind: "image" }>
  readonly showDetails: boolean
  readonly width: number
  readonly height: number
  readonly onLoad: (image: NativeImage) => void
  readonly onError: () => void
}) {
  return (
    <>
      <For each={previewTextLines(props.content, props.showDetails)}>
        {(line, index) => <text fg={index() === 0 ? "#ffffff" : "#aaaaaa"}>{line}</text>}
      </For>
      <image
        source={props.content.data}
        width={props.width}
        height={props.height}
        fit="fit"
        protocol="auto"
        onLoad={props.onLoad}
        onError={props.onError}
      />
    </>
  )
}
