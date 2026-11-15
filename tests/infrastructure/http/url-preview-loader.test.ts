import { describe, expect, test } from "bun:test"
import type { UrlPreviewTarget } from "../../../src/core/preview-target.js"
import {
  loadUrlPreview,
  type UrlPreviewDependencies,
} from "../../../src/infrastructure/http/url-preview-loader.js"

function target(value: string): UrlPreviewTarget {
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
      ).toMatchObject({ kind: "failure" })
    }
    expect(requests).toBe(0)

    expect(
      await loadUrlPreview(
        target("https://internal.test"),
        new AbortController().signal,
        dependencies(fetchImplementation, ["10.0.0.2"]),
      ),
    ).toMatchObject({
      kind: "failure",
      reason: "private-address",
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
      kind: "failure",
      reason: "private-address",
    })
    expect(requests).toBe(1)
  })

  test("silently ignores non-HTML responses and rejects oversized HTML", async () => {
    const nonHtml = async () =>
      new Response("plain", { headers: { "content-type": "text/plain" } })
    expect(
      await loadUrlPreview(
        target("https://example.com"),
        new AbortController().signal,
        dependencies(nonHtml),
      ),
    ).toBeUndefined()

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
      kind: "failure",
      reason: "html-too-large",
    })
  })

  test.each([
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/jpeg", [0xff, 0xd8, 0xff]],
    ["image/gif", [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ] as const)("loads direct %s URLs", async (mime, signature) => {
    const data = new Uint8Array(signature)
    const fetchImplementation = async () =>
      new Response(data, { headers: { "content-type": mime } })

    expect(
      await loadUrlPreview(
        target("https://example.com/assets/photo.png?token=secret#large"),
        new AbortController().signal,
        dependencies(fetchImplementation),
      ),
    ).toEqual({
      kind: "image",
      title: "photo.png",
      location: "https://example.com/assets/photo.png",
      mime,
      data,
    })
  })

  test("rejects invalid images and suppresses unsupported or disabled images", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const mismatch = async () =>
      new Response(png, { headers: { "content-type": "image/jpeg" } })
    expect(
      await loadUrlPreview(
        target("https://example.com/image.jpg"),
        new AbortController().signal,
        dependencies(mismatch),
      ),
    ).toMatchObject({
      kind: "failure",
      reason: "image-content-mismatch",
    })

    const unsupported = async () =>
      new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } })
    expect(
      await loadUrlPreview(
        target("https://example.com/image.svg"),
        new AbortController().signal,
        dependencies(unsupported),
      ),
    ).toBeUndefined()

    const valid = async () =>
      new Response(png, { headers: { "content-type": "image/png" } })
    expect(
      await loadUrlPreview(
        target("https://example.com/image.png"),
        new AbortController().signal,
        dependencies(valid),
        false,
      ),
    ).toBeUndefined()

    const oversized = async () =>
      new Response(null, {
        headers: {
          "content-type": "image/png",
          "content-length": String(10 * 1024 * 1024 + 1),
        },
      })
    expect(
      await loadUrlPreview(
        target("https://example.com/large.png"),
        new AbortController().signal,
        dependencies(oversized),
      ),
    ).toMatchObject({
      kind: "failure",
      reason: "image-too-large",
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
      kind: "failure",
      reason: "url-timeout",
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

  test("does not start a request when the caller has already cancelled", async () => {
    let requests = 0
    const controller = new AbortController()
    controller.abort(new DOMException("Cancelled", "AbortError"))

    await expect(
      loadUrlPreview(
        target("https://example.com"),
        controller.signal,
        dependencies(async () => {
          requests++
          return new Response()
        }),
      ),
    ).rejects.toBeDefined()
    expect(requests).toBe(0)
  })

  test("applies the timeout while DNS resolution is pending", async () => {
    const neverResolvingDns: UrlPreviewDependencies = {
      fetch: async () => {
        throw new Error("fetch should not run")
      },
      resolveHost: () => new Promise(() => {}),
      timeoutMs: 1,
    }

    expect(
      await loadUrlPreview(
        target("https://example.com"),
        new AbortController().signal,
        neverResolvingDns,
      ),
    ).toMatchObject({
      kind: "failure",
      reason: "url-timeout",
    })
  })
})
