import { Lexer, type Token } from "marked"
import { linkPreviewTarget, type PreviewTarget } from "../domain/preview-target.js"

export interface MarkdownProjection {
  readonly text: string
  readonly targets: PreviewTarget[]
}

interface MutableProjection {
  text: string
  targets: PreviewTarget[]
  safe: boolean
}

function appendTokens(tokens: readonly Token[], output: MutableProjection): void {
  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if (token.tokens !== undefined) appendTokens(token.tokens, output)
        else output.text += token.text
        break
      case "link": {
        if (token.tokens === undefined) {
          output.safe = false
          return
        }
        const start = output.text.length
        appendTokens(token.tokens, output)
        const end = output.text.length
        if (end > start) {
          const target = linkPreviewTarget(token.href, "markdown-projection", start, end)
          if (target !== undefined) output.targets.push(target)
        }
        break
      }
      case "strong":
      case "em":
      case "del":
        if (token.tokens === undefined) {
          output.safe = false
          return
        }
        appendTokens(token.tokens, output)
        break
      case "codespan":
      case "escape":
        output.text += token.text
        break
      case "br":
        output.text += "\n"
        break
      case "image":
        output.text += token.text
        break
      default:
        output.safe = false
        return
    }
  }
}

export function projectMarkdownInline(markdown: string): MarkdownProjection | undefined {
  const output: MutableProjection = { text: "", targets: [], safe: true }
  appendTokens(Lexer.lexInline(markdown), output)
  return output.safe ? { text: output.text, targets: output.targets } : undefined
}
