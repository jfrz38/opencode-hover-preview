export interface TimerScheduler<Handle> {
  set(callback: () => void, delayMs: number): Handle
  clear(handle: Handle): void
}

export interface HoverCandidate<T> {
  readonly key: string
  readonly value: T
}

export class HoverDelay<T, Handle = ReturnType<typeof setTimeout>> {
  private pending: Handle | undefined
  private generation = 0
  private currentKey: string | undefined

  constructor(
    private readonly delayMs: number,
    private readonly scheduler: TimerScheduler<Handle>,
    private readonly show: (candidate: HoverCandidate<T>) => void,
    private readonly hide: () => void,
  ) {}

  enter(candidate: HoverCandidate<T>): void {
    if (candidate.key === this.currentKey) return
    const hadCandidate = this.currentKey !== undefined
    this.cancelPending()
    const generation = ++this.generation
    this.currentKey = candidate.key
    if (hadCandidate) this.hide()
    this.pending = this.scheduler.set(() => {
      if (generation !== this.generation) return
      this.pending = undefined
      this.show(candidate)
    }, this.delayMs)
  }

  leave(): void {
    this.cancelPending()
    this.generation++
    this.currentKey = undefined
    this.hide()
  }

  dispose(): void {
    this.leave()
  }

  private cancelPending(): void {
    if (this.pending === undefined) return
    this.scheduler.clear(this.pending)
    this.pending = undefined
  }
}

export const systemTimerScheduler: TimerScheduler<ReturnType<typeof setTimeout>> = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (handle) => clearTimeout(handle),
}
