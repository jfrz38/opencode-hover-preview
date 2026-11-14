import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import type { PreviewContent } from "../domain/preview-content.js"
import type { PreviewTarget } from "../domain/preview-target.js"

const MAX_RESPONSE_BYTES = 256 * 1024
const MAX_REDIRECTS = 3
const DEFAULT_TIMEOUT_MS = 3_000

export interface UrlPreviewDependencies {
  readonly fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
  readonly resolveHost: (hostname: string) => Promise<readonly string[]>
  readonly timeoutMs?: number
}

const defaultDependencies: UrlPreviewDependencies = {
  fetch: (input, init) => fetch(input, init),
  resolveHost: async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address),
}

function unavailable(description: string): PreviewContent {
  return { kind: "unavailable", title: "URL preview unavailable", description }
}

function ipv4Number(address: string): number | undefined {
  const octets = address.split(".").map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return undefined
  }
  return (((octets[0]! << 24) >>> 0) + (octets[1]! << 16) + (octets[2]! << 8) + octets[3]!) >>> 0
}

function inIpv4Range(address: number, network: string, prefix: number): boolean {
  const networkNumber = ipv4Number(network)
  if (networkNumber === undefined) return true
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (address & mask) >>> 0 === (networkNumber & mask) >>> 0
}

function isPublicIpv4(address: string): boolean {
  const value = ipv4Number(address)
  if (value === undefined) return false

  const blocked: ReadonlyArray<readonly [string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
  ]
  return !blocked.some(([network, prefix]) => inIpv4Range(value, network, prefix))
}

function isPublicIp(address: string): boolean {
  if (isIP(address) === 4) return isPublicIpv4(address)
  if (isIP(address) !== 6) return false

  const normalized = address.toLowerCase()
  const mappedIpv4 = normalized.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/u)?.[1]
  if (mappedIpv4 !== undefined) return isPublicIpv4(mappedIpv4)

  return !(
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  )
}

function acceptedPort(url: URL): boolean {
  return url.port === "" || (url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")
}

function withAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason)

  return new Promise<T>((resolve, reject) => {
    const aborted = () => {
      cleanup()
      reject(signal.reason)
    }
    const cleanup = () => signal.removeEventListener("abort", aborted)
    signal.addEventListener("abort", aborted, { once: true })
    operation.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      },
    )
  })
}

async function validateUrl(
  url: URL,
  resolveHost: UrlPreviewDependencies["resolveHost"],
  signal: AbortSignal,
): Promise<string | undefined> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Only HTTP and HTTPS URLs are supported."
  if (url.username !== "" || url.password !== "") return "URLs with embedded credentials are not allowed."
  if (!acceptedPort(url)) return "Only standard HTTP and HTTPS ports are allowed."

  const hostname = url.hostname.replace(/^\[|\]$/gu, "")
  const addresses = isIP(hostname) === 0 ? await withAbort(resolveHost(hostname), signal) : [hostname]
  if (addresses.length === 0 || addresses.some((address) => !isPublicIp(address))) {
    return "Local and private network addresses are not allowed."
  }
  return undefined
}

function decodeEntities(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: "\"",
  }
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/giu, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10))
    return named[code.toLowerCase()] ?? entity
  })
}

function cleanText(value: string, maxLength: number): string {
  const cleaned = decodeEntities(value.replace(/<[^>]*>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim()
  const characters = [...cleaned]
  return characters.length <= maxLength ? cleaned : `${characters.slice(0, maxLength - 1).join("")}…`
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "iu"))
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

function extractMetadata(html: string): { readonly title?: string; readonly description?: string } {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)
  let description: string | undefined

  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = match[0]
    const name = (attribute(tag, "name") ?? attribute(tag, "property"))?.toLowerCase()
    if (name === "description" || name === "og:description") {
      const content = attribute(tag, "content")
      if (content !== undefined) {
        description = cleanText(content, 300)
        break
      }
    }
  }

  const title = titleMatch === null ? undefined : cleanText(titleMatch[1], 120)
  return { title: title || undefined, description: description || undefined }
}

async function readLimitedBody(response: Response, signal: AbortSignal): Promise<string | undefined> {
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) return undefined
  if (response.body === null) return ""

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const result = await reader.read()
      if (result.done) break
      received += result.value.byteLength
      if (received > MAX_RESPONSE_BYTES) {
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
  return new TextDecoder().decode(bytes)
}

function sanitizedUrl(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname}`
}

export async function loadUrlPreview(
  target: PreviewTarget,
  signal: AbortSignal,
  dependencies: UrlPreviewDependencies = defaultDependencies,
): Promise<PreviewContent> {
  if (target.kind !== "url") return unavailable("The target is not a URL.")

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal.reason)
  signal.addEventListener("abort", abortFromCaller, { once: true })
  const timeout = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    let url = new URL(target.value)
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      const validationError = await validateUrl(url, dependencies.resolveHost, controller.signal)
      if (validationError !== undefined) return unavailable(validationError)

      const response = await dependencies.fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { accept: "text/html" },
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
      if (!contentType.startsWith("text/html")) return unavailable("The URL did not return an HTML document.")

      const html = await readLimitedBody(response, controller.signal)
      if (html === undefined) return unavailable("The HTML document is too large to preview.")
      const metadata = extractMetadata(html)
      return {
        kind: "url",
        title: metadata.title ?? url.hostname,
        host: url.host,
        description: metadata.description,
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
