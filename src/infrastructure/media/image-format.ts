import {
  PREVIEW_IMAGE_MIMES,
  type PreviewImageMime,
} from "../../core/preview-content.js"

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

interface ImageFormatDetector {
  readonly mime: PreviewImageMime
  readonly matches: (bytes: Uint8Array) => boolean
}

const supportedImageMimes = new Set<string>(PREVIEW_IMAGE_MIMES)

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte)
}

export function detectImageMime(bytes: Uint8Array): PreviewImageMime | undefined {
  return imageFormatDetectors.find((detector) => detector.matches(bytes))?.mime
}

export function parseImageContentType(value: string | null): PreviewImageMime | undefined {
  const mime = value?.split(";", 1)[0]?.trim().toLowerCase()
  return mime !== undefined && supportedImageMimes.has(mime)
    ? (mime as PreviewImageMime)
    : undefined
}

const imageFormatDetectors: readonly ImageFormatDetector[] = [
  {
    mime: "image/png",
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: "image/jpeg",
    matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  },
  {
    mime: "image/gif",
    matches: (bytes) =>
      startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  },
  {
    mime: "image/webp",
    matches: (bytes) =>
      startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50,
  },
]
