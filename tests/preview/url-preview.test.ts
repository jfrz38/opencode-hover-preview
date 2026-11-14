import { describe, expect, test } from "bun:test"
import { loadUrlPreview, type UrlPreviewDependencies } from "../../src/preview/url-preview.js"
import type { PreviewTarget } from "../../src/domain/preview-target.js"

function target(value: string): PreviewTarget {
  return { kind: "url", value, source: "text", start: 0, end: value.length }
}

function dependencies(
  fetchImplementation: UrlPreviewDependencies["fetch"],
  addresses: readonly string[] = ["93.184.216.34"],
  timeoutMs = 100,
): UrlPreviewDependencies {
  return {
    fetch: fetchImplementation,
    resolveHost: async () => addresses,
    timeoutMs,
  }
}

describe("URL previews", () => {
  test("extracts bounded metadata without rendering HTML", async () => {
    const fetchImplementation = async () =>
      new Response(
        "<html><head><title>Example &amp; Docs</title><meta content='Useful documentation' name='description'></head></html>",
        { headers: { "content-type": "text/html; charset=utf-8" } },
      )

    expect(
      await loadUrlPreview(
        target("https://example.com/docs?token=secret#part"),
        new AbortController().signal,
        dependencies(fetchImplementation),
      ),
    ).toEqual({
      kind: "url",
      title: "Example & Docs",
      host: "example.com",
      description: "Useful documentation",
      url: "https://example.com/docs",
    })
  })

  test("rejects credentials, nonstandard ports, and private addresses before fetch", async () => {
    let requests = 0
    const fetchImplementation = async () => {
      requests++
      return new Response()
    }

    for (const value of [
      "https://user:secret@example.com",
      "https://example.com:8443",
      "http://127.0.0.1",
    ]) {
      expect(
        await loadUrlPreview(
          target(value),
          new AbortController().signal,
          dependencies(fetchImplementation),
        ),
      ).toMatchObject({ kind: "unavailable" })
    }
    expect(requests).toBe(0)

    expect(
      await loadUrlPreview(
        target("https://internal.test"),
        new AbortController().signal,
        dependencies(fetchImplementation, ["10.0.0.2"]),
      ),
    ).toMatchObject({
      kind: "unavailable",
      description: "Local and private network addresses are not allowed.",
    })
    expect(requests).toBe(0)
  })

  test("revalidates redirect destinations", async () => {
    let requests = 0
    const fetchImplementation = async () => {
      requests++
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } })
    }

    expect(
      await loadUrlPreview(
        target("https://example.com"),
        new AbortController().signal,
        dependencies(fetchImplementation),
      ),
    ).toMatchObject({
      kind: "unavailable",
      description: "Local and private network addresses are not allowed.",
    })
    expect(requests).toBe(1)
  })

  test("rejects non-HTML and oversized responses", async () => {
    const nonHtml = async () =>
      new Response("plain", { headers: { "content-type": "text/plain" } })
    expect(
      await loadUrlPreview(
        target("https://example.com"),
        new AbortController().signal,
        dependencies(nonHtml),
      ),
    ).toMatchObject({
      kind: "unavailable",
      description: "The URL did not return an HTML document.",
    })

    const oversized = async () =>
      new Response("<html></html>", {
        headers: { "content-type": "text/html", "content-length": String(300 * 1024) },
      })
    expect(
      await loadUrlPreview(
        target("https://example.com"),
        new AbortController().signal,
        dependencies(oversized),
      ),
    ).toMatchObject({
      kind: "unavailable",
      description: "The HTML document is too large to preview.",
    })
  })

  test("times out and propagates caller cancellation", async () => {
    const pending: UrlPreviewDependencies["fetch"] = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(init.signal.reason)
          return
        }
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true })
      })

    expect(
      await loadUrlPreview(
        target("https://example.com"),
        new AbortController().signal,
        dependencies(pending, ["93.184.216.34"], 1),
      ),
    ).toMatchObject({
      kind: "unavailable",
      description: "The URL preview timed out.",
    })

    const controller = new AbortController()
    const preview = loadUrlPreview(
      target("https://example.com"),
      controller.signal,
      dependencies(pending),
    )
    controller.abort()
    await expect(preview).rejects.toBeDefined()
  })
})
