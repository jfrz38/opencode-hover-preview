export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export type SupportedImageMime = "image/png" | "image/jpeg" | "image/gif" | "image/webp"

const supportedImageMimes = new Set<SupportedImageMime>([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte)
}

export function detectImageMime(bytes: Uint8Array): SupportedImageMime | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg"
  if (
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif"
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp"
  }
  return undefined
}

export function parseImageContentType(value: string | null): SupportedImageMime | undefined {
  const mime = value?.split(";", 1)[0]?.trim().toLowerCase()
  return mime !== undefined && supportedImageMimes.has(mime as SupportedImageMime)
    ? (mime as SupportedImageMime)
    : undefined
}
