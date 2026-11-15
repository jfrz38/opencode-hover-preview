import { describe, expect, test } from "bun:test"
import { projectMarkdownInline } from "../../src/opentui/markdown-projection.js"

describe("Markdown inline projection", () => {
  test("maps a rendered label to its URL", () => {
    expect(projectMarkdownInline("See [OpenCode](https://opencode.ai) now")).toEqual({
      text: "See OpenCode now",
      targets: [
        {
          kind: "url",
          value: "https://opencode.ai",
          source: "markdown-projection",
          start: 4,
          end: 12,
        },
      ],
    })
  })

  test("concealed emphasis before and inside a link does not shift its visible range", () => {
    expect(projectMarkdownInline("**Important:** [read *the docs*](<https://example.com/docs>)")).toEqual({
      text: "Important: read the docs",
      targets: [
        {
          kind: "url",
          value: "https://example.com/docs",
          source: "markdown-projection",
          start: 11,
          end: 24,
        },
      ],
    })
  })

  test("projects several links and optional titles", () => {
    expect(projectMarkdownInline('[one](https://one.test) and [two](https://two.test "Second")')).toEqual({
      text: "one and two",
      targets: [
        {
          kind: "url",
          value: "https://one.test",
          source: "markdown-projection",
          start: 0,
          end: 3,
        },
        {
          kind: "url",
          value: "https://two.test",
          source: "markdown-projection",
          start: 8,
          end: 11,
        },
      ],
    })
  })

  test("projects inline code in a label", () => {
    expect(projectMarkdownInline("[`config`](https://example.com/config)")).toEqual({
      text: "config",
      targets: [
        {
          kind: "url",
          value: "https://example.com/config",
          source: "markdown-projection",
          start: 0,
          end: 6,
        },
      ],
    })
  })

  test("maps local file links and ignores unsupported schemes", () => {
    expect(projectMarkdownInline("[read me](./docs/README%20first.md#start) [mail](mailto:a@b.test)")).toEqual({
      text: "read me mail",
      targets: [
        {
          kind: "file-link",
          value: "./docs/README%20first.md#start",
          source: "markdown-projection",
          start: 0,
          end: 7,
        },
      ],
    })
  })
})
