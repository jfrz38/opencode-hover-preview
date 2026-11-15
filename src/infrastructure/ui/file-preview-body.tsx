import type { SyntaxStyle } from "@opentui/core"
import { For, Show } from "solid-js"
import type { PreviewOutcome } from "../../core/preview-content.js"
import { previewTextLines } from "./preview-content-display.js"
import { resolveFilePreviewFormat } from "./file-preview-format.js"

export function FilePreviewBody(props: {
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
