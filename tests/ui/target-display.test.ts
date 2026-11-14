import { describe, expect, test } from "bun:test"
import { formatPreviewTarget } from "../../src/ui/target-display.js"

describe("diagnostic target display", () => {
  test("removes URL query parameters and fragments", () => {
    expect(
      formatPreviewTarget({
        kind: "url",
        value: "https://example.com/docs/page?token=secret#section",
        source: "text",
        start: 0,
        end: 0,
      }),
    ).toBe("https://example.com/docs/page")
  })

  test("truncates long destinations to the requested width", () => {
    expect(
      formatPreviewTarget(
        { kind: "path", value: "./very/long/path/to/README.md", source: "text", start: 0, end: 0 },
        12,
      ),
    ).toBe("./very/long…")
  })
})
