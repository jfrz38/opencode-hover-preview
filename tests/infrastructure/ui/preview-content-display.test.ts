import { describe, expect, test } from "bun:test"
import type { PreviewOutcome } from "../../../src/core/preview-content.js"
import { previewTextLines } from "../../../src/infrastructure/ui/preview-content-display.js"

describe("preview content display", () => {
  test("hides redundant file and image metadata by default", () => {
    const file: PreviewOutcome = {
      kind: "file",
      title: "README.md",
      path: "docs/README.md",
      body: "# Documentation",
      truncated: false,
    }
    const image: PreviewOutcome = {
      kind: "image",
      title: "diagram.png",
      location: "docs/diagram.png",
      mime: "image/png",
      data: new Uint8Array(),
    }

    expect(previewTextLines(file, false)).toEqual([])
    expect(previewTextLines(image, false)).toEqual([])
  })

  test("shows only useful URL metadata by default", () => {
    const url: PreviewOutcome = {
      kind: "url",
      title: "OpenCode",
      host: "opencode.ai",
      description: "AI-powered coding agent",
      url: "https://opencode.ai/docs",
    }

    expect(previewTextLines(url, false)).toEqual(["OpenCode", "AI-powered coding agent"])
  })

  test("restores complete metadata when details are enabled", () => {
    const file: PreviewOutcome = {
      kind: "file",
      title: "README.md",
      path: "docs/README.md",
      body: "# Documentation",
      truncated: true,
    }
    const image: PreviewOutcome = {
      kind: "image",
      title: "diagram.png",
      location: "docs/diagram.png",
      mime: "image/png",
      data: new Uint8Array(),
    }
    const url: PreviewOutcome = {
      kind: "url",
      title: "OpenCode",
      host: "opencode.ai",
      description: "AI-powered coding agent",
      url: "https://opencode.ai/docs",
    }

    expect(previewTextLines(file, true)).toEqual(["README.md", "docs/README.md"])
    expect(previewTextLines(image, true)).toEqual(["diagram.png", "docs/diagram.png"])
    expect(previewTextLines(url, true)).toEqual([
      "OpenCode",
      "opencode.ai",
      "AI-powered coding agent",
      "https://opencode.ai/docs",
    ])
  })

  test("always displays loading failures", () => {
    const unavailable: PreviewOutcome = {
      kind: "unavailable",
      title: "Preview unavailable",
      description: "The preview could not be loaded.",
    }

    expect(previewTextLines(unavailable, false)).toEqual([
      "Preview unavailable",
      "The preview could not be loaded.",
    ])
  })
})
