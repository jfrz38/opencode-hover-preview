import { describe, expect, test } from "bun:test"
import type { PreviewOutcome } from "../../../src/core/preview-content.js"
import type { UrlPreviewTarget } from "../../../src/core/preview-target.js"
import {
  PreviewSession,
  type PreviewLoader,
  type PreviewSessionState,
} from "../../../src/infrastructure/ui/preview-session.js"

interface Candidate {
  readonly target: UrlPreviewTarget
  readonly pointer: number
}

const target = (value: string): UrlPreviewTarget => ({
  kind: "url",
  value,
  source: "text",
  start: 0,
  end: value.length,
})

const outcome = (title: string): PreviewOutcome => ({
  kind: "url",
  title,
  host: "example.com",
  url: "https://example.com/",
})

const flushPromises = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe("preview session", () => {
  test("cancels the previous load and ignores its stale result", async () => {
    const pending: Array<{
      readonly signal: AbortSignal
      readonly resolve: (value: PreviewOutcome) => void
    }> = []
    const loader: PreviewLoader = (_target, signal) =>
      new Promise((resolve) => pending.push({ signal, resolve }))
    const states: Array<PreviewSessionState<Candidate> | undefined> = []
    const session = new PreviewSession<Candidate>(loader, (state) => states.push(state))

    session.show({ target: target("https://first.test"), pointer: 1 })
    session.show({ target: target("https://second.test"), pointer: 2 })

    expect(pending[0]?.signal.aborted).toBe(true)
    pending[0]?.resolve(outcome("First"))
    pending[1]?.resolve(outcome("Second"))
    await flushPromises()

    expect(states).toHaveLength(1)
    expect(states[0]?.candidate.pointer).toBe(2)
    expect(states[0]?.outcome).toMatchObject({ title: "Second" })
  })

  test("reuses successful content from the cache", async () => {
    let loads = 0
    const states: Array<PreviewSessionState<Candidate> | undefined> = []
    const session = new PreviewSession<Candidate>(
      async () => {
        loads++
        return outcome("Cached")
      },
      (state) => states.push(state),
    )
    const candidate = { target: target("https://example.com"), pointer: 1 }

    session.show(candidate)
    await flushPromises()
    session.hide()
    session.show({ ...candidate, pointer: 2 })
    await flushPromises()

    expect(loads).toBe(1)
    expect(states.at(-1)?.candidate.pointer).toBe(2)
  })

  test("does not cache failure outcomes", async () => {
    let loads = 0
    const session = new PreviewSession<Candidate>(
      async () => {
        loads++
        return {
          kind: "failure",
          reason: "load-failed",
        }
      },
      () => {},
    )
    const candidate = { target: target("https://example.com"), pointer: 1 }

    session.show(candidate)
    await flushPromises()
    session.show(candidate)
    await flushPromises()

    expect(loads).toBe(2)
  })

  test("maps loader failures and aborts active work when disposed", async () => {
    let activeSignal: AbortSignal | undefined
    const states: Array<PreviewSessionState<Candidate> | undefined> = []
    const loader: PreviewLoader = (_target, signal) => {
      activeSignal = signal
      return Promise.reject(new Error("failed"))
    }
    const session = new PreviewSession<Candidate>(
      loader,
      (state) => states.push(state),
    )

    session.show({ target: target("https://example.com"), pointer: 1 })
    await flushPromises()
    expect(states.at(-1)?.outcome.kind).toBe("failure")

    const pending = new PreviewSession<Candidate>(
      (_target, signal) => {
        activeSignal = signal
        return new Promise(() => {})
      },
      () => {},
    )
    pending.show({ target: target("https://pending.test"), pointer: 1 })
    pending.dispose()

    expect(activeSignal?.aborted).toBe(true)
  })
})
