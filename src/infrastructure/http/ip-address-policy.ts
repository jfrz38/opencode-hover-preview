import { isIP } from "node:net"

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
    ["240.0.0.0", 4],
  ]
  return !blocked.some(([network, prefix]) => inIpv4Range(value, network, prefix))
}

function mappedIpv4Address(address: string): string | undefined {
  const dotted = address.match(/^(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/u)?.[1]
  if (dotted !== undefined) return dotted

  const hexadecimal = address.match(/^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/u)
  if (hexadecimal === null) return undefined
  const high = Number.parseInt(hexadecimal[1] ?? "", 16)
  const low = Number.parseInt(hexadecimal[2] ?? "", 16)
  return `${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`
}

export function isPublicIpAddress(address: string): boolean {
  if (isIP(address) === 4) return isPublicIpv4(address)
  if (isIP(address) !== 6) return false

  const normalized = address.toLowerCase()
  const mappedIpv4 = mappedIpv4Address(normalized)
  if (mappedIpv4 !== undefined) return isPublicIpv4(mappedIpv4)

  return !(
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[cdef]/u.test(normalized) ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  )
}
