import { lookup } from "node:dns/promises"
import type { PreviewOutcome } from "../../core/preview-content.js"
import type { UrlPreviewTarget } from "../../core/preview-target.js"
import { detectImageMime, MAX_IMAGE_BYTES, parseImageContentType } from "../media/image-format.js"
import { extractHtmlMetadata } from "./html-metadata.js"
import { readLimitedResponseBody } from "./limited-response-body.js"
import { type HostResolver, validatePublicUrl } from "./public-url-policy.js"

const MAX_HTML_BYTES = 256 * 1024
const MAX_REDIRECTS = 3
const DEFAULT_TIMEOUT_MS = 3_000

export interface UrlPreviewDependencies {
  readonly fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  readonly resolveHost: HostResolver
  readonly timeoutMs?: number
}

const defaultDependencies: UrlPreviewDependencies = {
  fetch: (input, init) => fetch(input, init),
  resolveHost: async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address),
}

function sanitizedUrl(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname}`
}

export async function loadUrlPreview(
  target: UrlPreviewTarget,
  signal: AbortSignal,
  dependencies: UrlPreviewDependencies = defaultDependencies,
  imagePreview = true,
): Promise<PreviewOutcome | undefined> {
  if (signal.aborted) throw signal.reason
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal.reason)
  signal.addEventListener("abort", abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
      let url = new URL(target.value)
      for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
        const validationError = await validatePublicUrl(url, dependencies.resolveHost, controller.signal)
        if (validationError !== undefined) return validationError

      const response = await dependencies.fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { accept: "text/html,image/png,image/jpeg,image/gif,image/webp" },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (location === null) return { kind: "failure", reason: "redirect-without-location" }
        if (redirects === MAX_REDIRECTS) return { kind: "failure", reason: "too-many-redirects" }
        url = new URL(location, url)
        continue
      }
      if (!response.ok) return { kind: "failure", reason: "http-error", status: response.status }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
      const imageMime = parseImageContentType(contentType)
      if (imageMime !== undefined) {
        if (!imagePreview) return undefined
        const body = await readLimitedResponseBody(response, controller.signal, MAX_IMAGE_BYTES)
        if (body.kind === "too-large") return { kind: "failure", reason: "image-too-large" }
        const { bytes: data } = body
        if (detectImageMime(data) !== imageMime) {
          return { kind: "failure", reason: "image-content-mismatch" }
        }

        const encodedName = url.pathname.split("/").filter(Boolean).at(-1)
        let title = encodedName ?? url.hostname
        try {
          title = decodeURIComponent(title)
        } catch {
          // Keep the encoded path segment when it is not valid URI text.
        }
        return {
          kind: "image",
          title,
          location: sanitizedUrl(url),
          mime: imageMime,
          data,
        }
      }
      if (contentType.startsWith("image/")) {
        return undefined
      }
      if (!contentType.startsWith("text/html")) return undefined

      const body = await readLimitedResponseBody(response, controller.signal, MAX_HTML_BYTES)
      if (body.kind === "too-large") return { kind: "failure", reason: "html-too-large" }
      const { bytes: htmlBytes } = body
      if (detectImageMime(htmlBytes) !== undefined) {
        return { kind: "failure", reason: "content-type-mismatch" }
      }
      const html = new TextDecoder().decode(htmlBytes)
      const metadata = extractHtmlMetadata(html)
      return {
        kind: "url",
        title: metadata.title ?? url.hostname,
        host: url.host,
        ...(metadata.description === undefined ? {} : { description: metadata.description }),
        url: sanitizedUrl(url),
      }
    }
    return { kind: "failure", reason: "too-many-redirects" }
  } catch (error) {
    if (signal.aborted) throw error
    if (controller.signal.aborted) return { kind: "failure", reason: "url-timeout" }
    return { kind: "failure", reason: "load-failed" }
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener("abort", abortFromCaller)
  }
}
