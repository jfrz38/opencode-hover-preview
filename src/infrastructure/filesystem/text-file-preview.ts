import { open } from "node:fs/promises"

export const MAX_READ_BYTES = 64 * 1024
const MAX_PREVIEW_CHARACTERS = 4_000
const MAX_PREVIEW_LINES = 20

export interface TextFilePreview {
  readonly body: string
  readonly truncated: boolean
}

export async function readFilePrefix(
  path: string,
  size: number,
  signal: AbortSignal,
  maxBytes = MAX_READ_BYTES,
): Promise<Uint8Array> {
  const file = await open(path, "r")
  try {
    signal.throwIfAborted()
    const length = Math.min(size, maxBytes + 1)
    const buffer = new Uint8Array(length)
    let offset = 0
    while (offset < length) {
      signal.throwIfAborted()
      const { bytesRead } = await file.read(buffer, offset, length - offset, offset)
      if (bytesRead === 0) break
      offset += bytesRead
    }
    return buffer.subarray(0, offset)
  } finally {
    await file.close()
  }
}

export function previewTextFile(bytes: Uint8Array, fileSize: number): TextFilePreview | undefined {
  if (bytes.includes(0)) return undefined

  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true })
      .decode(bytes)
      .replace(/\r\n?/gu, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
  } catch {
    return undefined
  }

  const lines = text.split("\n")
  const limitedLines = lines.slice(0, MAX_PREVIEW_LINES).join("\n")
  const characters = [...limitedLines]
  return {
    body: characters.slice(0, MAX_PREVIEW_CHARACTERS).join(""),
    truncated:
      lines.length > MAX_PREVIEW_LINES ||
      characters.length > MAX_PREVIEW_CHARACTERS ||
      fileSize > MAX_READ_BYTES,
  }
}
