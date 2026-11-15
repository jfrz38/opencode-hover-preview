import { isIP } from "node:net"

export type HostResolver = (hostname: string) => Promise<readonly string[]>

function ipv4Number(address: string): number | undefined {
  const octets = address.split(".").map(Number)
  const [first, second, third, fourth] = octets
  if (
    octets.length !== 4 ||
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return undefined
  }
  return (((first << 24) >>> 0) + (second << 16) + (third << 8) + fourth) >>> 0
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
  const dottedMappedIpv4 = normalized.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/u)?.[1]
  const hexadecimalMappedIpv4 = normalized.match(/^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/u)
  const mappedIpv4 =
    dottedMappedIpv4 ??
    (hexadecimalMappedIpv4 === null
      ? undefined
      : (() => {
          const high = Number.parseInt(hexadecimalMappedIpv4[1] ?? "", 16)
          const low = Number.parseInt(hexadecimalMappedIpv4[2] ?? "", 16)
          return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`
        })())
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
): Promise<string | undefined> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "Only HTTP and HTTPS URLs are supported."
  }
  if (url.username !== "" || url.password !== "") {
    return "URLs with embedded credentials are not allowed."
  }
  if (!acceptedPort(url)) return "Only standard HTTP and HTTPS ports are allowed."

  const hostname = url.hostname.replace(/^\[|\]$/gu, "")
  const addresses = isIP(hostname) === 0 ? await withAbort(resolveHost(hostname), signal) : [hostname]
  if (addresses.length === 0 || addresses.some((address) => !isPublicIp(address))) {
    return "Local and private network addresses are not allowed."
  }
  return undefined
}
