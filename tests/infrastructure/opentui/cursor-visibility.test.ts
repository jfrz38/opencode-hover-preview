import type { CursorState, OptimizedBuffer } from "@opentui/core"
import { expect, test } from "bun:test"
import { hideCursorWhile } from "../../../src/infrastructure/opentui/cursor-visibility.js"

type PostProcessFn = (buffer: OptimizedBuffer, deltaTime: number) => void

function rendererStub() {
  const callbacks: PostProcessFn[] = []
  const positions: Array<{ x: number; y: number; visible: boolean }> = []

  const renderer = {
    getCursorState: () => ({ x: 12, y: 7 }) as unknown as CursorState,
    setCursorPosition: (x: number, y: number, visible: boolean): void => {
      positions.push({ x, y, visible })
    },
    addPostProcessFn: (callback: PostProcessFn): void => {
      callbacks.push(callback)
    },
    removePostProcessFn: (callback: PostProcessFn): void => {
      const index = callbacks.indexOf(callback)
      if (index !== -1) callbacks.splice(index, 1)
    },
  }

  return {
    renderer,
    positions,
    callbackCount: () => callbacks.length,
    postProcess: () => {
      for (const callback of callbacks) callback(undefined as unknown as OptimizedBuffer, 0)
    },
  }
}

test("hides the caret at its current position while active", () => {
  const { renderer, positions, callbackCount, postProcess } = rendererStub()
  let active = false
  hideCursorWhile(renderer, () => active)

  expect(callbackCount()).toBe(1)
  postProcess()
  expect(positions).toHaveLength(0)

  active = true
  postProcess()
  expect(positions).toEqual([{ x: 12, y: 7, visible: false }])
})

test("removes the post-process callback on cleanup", () => {
  const { renderer, callbackCount } = rendererStub()
  const stop = hideCursorWhile(renderer, () => true)

  expect(callbackCount()).toBe(1)
  stop()
  expect(callbackCount()).toBe(0)
})
