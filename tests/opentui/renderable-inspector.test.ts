import { expect, test } from "bun:test"
import { BoxRenderable, MarkdownRenderable, StyledText, SyntaxStyle, TextRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { inspectRenderable } from "../../src/opentui/renderable-inspector.js"

test("uses link chunk metadata for Markdown-style labels", async () => {
  const setup = await createTestRenderer({ width: 30, height: 4 })

  try {
    const text = new TextRenderable(setup.renderer, {
      content: new StyledText([
        { __isChunk: true, text: "see " },
        { __isChunk: true, text: "documentation", link: { url: "https://example.com/docs" } },
      ]),
      width: 30,
    })
    const container = new BoxRenderable(setup.renderer, {
      position: "absolute",
      left: 3,
      top: 1,
      width: 30,
      height: 1,
    })
    container.add(text)
    setup.renderer.root.add(container)
    await setup.renderOnce()

    expect(inspectRenderable(text, { x: text.screenX + 5, y: text.screenY }).target).toMatchObject({
      kind: "url",
      value: "https://example.com/docs",
      source: "link-metadata",
    })
    expect(inspectRenderable(text, { x: text.screenX + 1, y: text.screenY }).target).toBeUndefined()
  } finally {
    setup.renderer.destroy()
  }
})

test("projects a real concealed Markdown renderable but keeps source mode literal", async () => {
  const setup = await createTestRenderer({ width: 70, height: 4 })
  const syntaxStyle = SyntaxStyle.fromStyles({ default: {} }, setup.renderer.nativeScene)

  try {
    const markdown = new MarkdownRenderable(setup.renderer, {
      content: "See [OpenCode](https://opencode.ai) now",
      syntaxStyle,
      conceal: true,
      width: 70,
    })
    setup.renderer.root.add(markdown)
    await setup.renderOnce()

    const block = markdown.getChildren()[0]!
    expect(inspectRenderable(block, { x: 5, y: 0 }).target).toMatchObject({
      value: "https://opencode.ai",
      source: "markdown-projection",
    })

    markdown.conceal = false
    expect(inspectRenderable(block, { x: 5, y: 0 }).target).toBeUndefined()
    expect(inspectRenderable(block, { x: 17, y: 0 }).target).toMatchObject({
      value: "https://opencode.ai",
      source: "text",
    })
  } finally {
    setup.renderer.destroy()
    syntaxStyle.destroy()
  }
})

test("projects flattened Markdown when visual width matches the rendered label", async () => {
  const setup = await createTestRenderer({ width: 40, height: 3 })

  try {
    const text = new TextRenderable(setup.renderer, {
      content: "[label](https://example.com)",
      width: 40,
    })
    setup.renderer.root.add(text)
    await setup.renderOnce()
    Object.defineProperty(text, "lineInfo", {
      configurable: true,
      get: () => ({
        lineStartCols: [0],
        lineWidthCols: [5],
        lineWidthColsMax: 5,
        lineSources: [0],
        lineWraps: [0],
      }),
    })

    expect(inspectRenderable(text, { x: 2, y: 0 }).target).toMatchObject({
      value: "https://example.com",
      source: "markdown-projection",
    })
  } finally {
    setup.renderer.destroy()
  }
})

test("resolves local link metadata but ignores placeholders", async () => {
  const setup = await createTestRenderer({ width: 40, height: 3 })

  try {
    const text = new TextRenderable(setup.renderer, {
      content: new StyledText([
        { __isChunk: true, text: "guide", link: { url: "./docs/guide.md" } },
        { __isChunk: true, text: " [Pasted ~3 lines] [Image 1]" },
      ]),
      width: 40,
    })
    setup.renderer.root.add(text)
    await setup.renderOnce()

    expect(inspectRenderable(text, { x: 2, y: 0 }).target).toMatchObject({
      kind: "file-link",
      value: "./docs/guide.md",
      source: "link-metadata",
    })
    expect(inspectRenderable(text, { x: 8, y: 0 }).target).toBeUndefined()
    expect(inspectRenderable(text, { x: 27, y: 0 }).target).toBeUndefined()
  } finally {
    setup.renderer.destroy()
  }
})
