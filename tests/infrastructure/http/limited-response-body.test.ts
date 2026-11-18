import { describe, expect, test } from "bun:test"
import { readLimitedResponseBody } from "../../../src/infrastructure/http/limited-response-body.js"

describe("limited response body", () => {
  test("rejects a streamed body that exceeds its limit without Content-Length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4]))
        controller.close()
      },
    })
    const response = new Response(body)

    await expect(
      readLimitedResponseBody(response, new AbortController().signal, 3),
    ).resolves.toEqual({ kind: "too-large" })
  })

  test("returns complete bounded data", async () => {
    const response = new Response(new Uint8Array([1, 2, 3]))

    await expect(
      readLimitedResponseBody(response, new AbortController().signal, 3),
    ).resolves.toEqual({ kind: "complete", bytes: new Uint8Array([1, 2, 3]) })
  })
})
