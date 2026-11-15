import { describe, expect, test } from "bun:test"
import { resolveFilePreviewFormat } from "../../src/ui/file-preview-format.js"

describe("file preview formatting", () => {
  test("selects the Markdown renderer for Markdown extensions", () => {
    expect(resolveFilePreviewFormat("md")).toEqual({ kind: "markdown" })
    expect(resolveFilePreviewFormat("MARKDOWN")).toEqual({ kind: "markdown" })
  })

  test("maps JavaScript and TypeScript extensions to native filetypes", () => {
    expect(resolveFilePreviewFormat("js")).toEqual({ kind: "code", filetype: "javascript" })
    expect(resolveFilePreviewFormat("mjs")).toEqual({ kind: "code", filetype: "javascript" })
    expect(resolveFilePreviewFormat("cjs")).toEqual({ kind: "code", filetype: "javascript" })
    expect(resolveFilePreviewFormat("jsx")).toEqual({ kind: "code", filetype: "javascriptreact" })
    expect(resolveFilePreviewFormat("ts")).toEqual({ kind: "code", filetype: "typescript" })
    expect(resolveFilePreviewFormat("mts")).toEqual({ kind: "code", filetype: "typescript" })
    expect(resolveFilePreviewFormat("cts")).toEqual({ kind: "code", filetype: "typescript" })
    expect(resolveFilePreviewFormat("tsx")).toEqual({ kind: "code", filetype: "typescriptreact" })
  })

  test("passes other extensions through for native or fallback rendering", () => {
    expect(resolveFilePreviewFormat("zig")).toEqual({ kind: "code", filetype: "zig" })
    expect(resolveFilePreviewFormat("JAVA")).toEqual({ kind: "code", filetype: "java" })
    expect(resolveFilePreviewFormat("json")).toEqual({ kind: "code", filetype: "json" })
  })

  test("uses plain text when a file has no extension", () => {
    expect(resolveFilePreviewFormat(undefined)).toEqual({ kind: "plain" })
    expect(resolveFilePreviewFormat("")).toEqual({ kind: "plain" })
  })
})
