import { describe, expect, test } from "bun:test"
import {
  HoverDelay,
  type TimerScheduler,
} from "../../../src/infrastructure/ui/hover-delay.js"

class ManualScheduler implements TimerScheduler<number> {
  private nextHandle = 0
  private readonly callbacks = new Map<number, () => void>()

  set(callback: () => void): number {
    const handle = ++this.nextHandle
    this.callbacks.set(handle, callback)
    return handle
  }

  clear(handle: unknown): void {
    this.callbacks.delete(handle as number)
  }

  flush(): void {
    const callbacks = [...this.callbacks.values()]
    this.callbacks.clear()
    callbacks.forEach((callback) => callback())
  }

  get pendingCount(): number {
    return this.callbacks.size
  }
}

describe("hover delay", () => {
  test("shows the latest candidate after the delay", () => {
    const scheduler = new ManualScheduler()
    const shown: string[] = []
    const delay = new HoverDelay<string, number>(500, scheduler, (candidate) => shown.push(candidate.value), () => {})

    delay.enter({ key: "first", value: "first" })
    delay.enter({ key: "second", value: "second" })
    scheduler.flush()

    expect(shown).toEqual(["second"])
  })

  test("leaving cancels pending work and hides the overlay", () => {
    const scheduler = new ManualScheduler()
    const shown: string[] = []
    let hidden = 0
    const delay = new HoverDelay<string, number>(500, scheduler, (candidate) => shown.push(candidate.value), () => hidden++)

    delay.enter({ key: "target", value: "target" })
    delay.leave()
    scheduler.flush()

    expect(shown).toEqual([])
    expect(hidden).toBe(1)
  })

  test("movement inside the same target does not restart the delay", () => {
    const scheduler = new ManualScheduler()
    const shown: string[] = []
    const delay = new HoverDelay<string, number>(500, scheduler, (candidate) => shown.push(candidate.value), () => {})

    delay.enter({ key: "same", value: "first position" })
    delay.enter({ key: "same", value: "second position" })

    expect(scheduler.pendingCount).toBe(1)
    scheduler.flush()
    expect(shown).toEqual(["first position"])
  })
})
