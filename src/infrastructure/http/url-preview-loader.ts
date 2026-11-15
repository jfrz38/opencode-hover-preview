import { lookup } from "node:dns/promises"
import type { PreviewOutcome, UnavailablePreview } from "../../core/preview-content.js"
import type { UrlPreviewTarget } from "../../core/preview-target.js"
import { detectImageMime, MAX_IMAGE_BYTES, parseImageContentType } from "../media/image-format.js"
import { extractHtmlMetadata } from "./html-metadata.js"
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

function unavailable(description: string): UnavailablePreview {
  return { kind: "unavailable", title: "URL preview unavailable", description }
}

async function readLimitedBytes(
  response: Response,
  signal: AbortSignal,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return undefined
  if (response.body === null) return new Uint8Array()

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const result = await reader.read()
      if (result.done) break
      received += result.value.byteLength
      if (received > maxBytes) {
        await reader.cancel()
        return undefined
      }
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
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
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal.reason)
  signal.addEventListener("abort", abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    let url = new URL(target.value)
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const validationError = await validatePublicUrl(url, dependencies.resolveHost, controller.signal)
      if (validationError !== undefined) return unavailable(validationError)

      const response = await dependencies.fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { accept: "text/html,image/png,image/jpeg,image/gif,image/webp" },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (location === null) return unavailable("The redirect did not include a destination.")
        if (redirects === MAX_REDIRECTS) return unavailable("The URL redirected too many times.")
        url = new URL(location, url)
        continue
      }
      if (!response.ok) return unavailable(`The server returned HTTP ${response.status}.`)

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
      const imageMime = parseImageContentType(contentType)
      if (imageMime !== undefined) {
        if (!imagePreview) return undefined
        const data = await readLimitedBytes(response, controller.signal, MAX_IMAGE_BYTES)
        if (data === undefined) return unavailable("The image is too large to preview.")
        if (detectImageMime(data) !== imageMime) {
          return unavailable("The image content did not match its Content-Type.")
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

      const htmlBytes = await readLimitedBytes(response, controller.signal, MAX_HTML_BYTES)
      if (htmlBytes === undefined) return unavailable("The HTML document is too large to preview.")
      if (detectImageMime(htmlBytes) !== undefined) {
        return unavailable("The response content did not match its Content-Type.")
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
    return unavailable("The URL redirected too many times.")
  } catch (error) {
    if (signal.aborted) throw error
    if (controller.signal.aborted) return unavailable("The URL preview timed out.")
    return unavailable("The URL could not be loaded.")
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener("abort", abortFromCaller)
  }
}
