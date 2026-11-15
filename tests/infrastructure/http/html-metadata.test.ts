import { describe, expect, test } from "bun:test"
import { extractHtmlMetadata } from "../../../src/infrastructure/http/html-metadata.js"

describe("HTML metadata", () => {
  test("extracts and sanitizes title and description", () => {
    expect(
      extractHtmlMetadata(
        "<title>Example &amp; <b>Docs</b></title><meta property='og:description' content=' Useful   docs '>",
      ),
    ).toEqual({
      title: "Example & Docs",
      description: "Useful docs",
    })
  })

  test("omits missing and empty metadata", () => {
    expect(extractHtmlMetadata("<html><head></head></html>")).toEqual({})
    expect(
      extractHtmlMetadata("<title> </title><meta name='description' content=' '>"),
    ).toEqual({})
  })
})
