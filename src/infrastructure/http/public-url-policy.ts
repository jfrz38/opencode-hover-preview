import { isIP } from "node:net"
import type { PreviewFailure } from "../../core/preview-failure.js"
import { isPublicIpAddress } from "./ip-address-policy.js"

export type HostResolver = (hostname: string) => Promise<readonly string[]>

function acceptedPort(url: URL): boolean {
  return (
    url.port === "" ||
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  )
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

export async function validatePublicUrl(
  url: URL,
  resolveHost: HostResolver,
  signal: AbortSignal,
): Promise<Extract<PreviewFailure, { readonly reason: "unsupported-url" | "url-credentials" | "nonstandard-port" | "private-address" }> | undefined> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { kind: "failure", reason: "unsupported-url" }
  }
  if (url.username !== "" || url.password !== "") {
    return { kind: "failure", reason: "url-credentials" }
  }
  if (!acceptedPort(url)) return { kind: "failure", reason: "nonstandard-port" }

  const hostname = url.hostname.replace(/^\[|\]$/gu, "")
  const addresses = isIP(hostname) === 0 ? await withAbort(resolveHost(hostname), signal) : [hostname]
  if (addresses.length === 0 || addresses.some((address) => !isPublicIpAddress(address))) {
    return { kind: "failure", reason: "private-address" }
  }
  return undefined
}
