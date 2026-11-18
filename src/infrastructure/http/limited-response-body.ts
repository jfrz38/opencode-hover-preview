export type LimitedResponseBody =
  | { readonly kind: "complete"; readonly bytes: Uint8Array }
  | { readonly kind: "too-large" }

export async function readLimitedResponseBody(
  response: Response,
  signal: AbortSignal,
  maxBytes: number,
): Promise<LimitedResponseBody> {
  const declaredLength = Number(response.headers.get("content-length"))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return { kind: "too-large" }
  if (response.body === null) return { kind: "complete", bytes: new Uint8Array() }

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
        return { kind: "too-large" }
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
  return { kind: "complete", bytes }
}
