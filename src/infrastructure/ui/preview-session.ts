import type { PreviewOutcome, UnavailablePreview } from "../../core/preview-content.js"
import type { PreviewTarget } from "../../core/preview-target.js"
import { PreviewCache } from "../cache/preview-cache.js"

export type PreviewLoader = (
  target: PreviewTarget,
  signal: AbortSignal,
) => Promise<PreviewOutcome | undefined>

export interface PreviewSessionCandidate {
  readonly target: PreviewTarget
}

export interface PreviewSessionState<Candidate extends PreviewSessionCandidate> {
  readonly candidate: Candidate
  readonly outcome: PreviewOutcome
}

export class PreviewSession<Candidate extends PreviewSessionCandidate> {
  private activeLoad: AbortController | undefined
  private generation = 0

  constructor(
    private readonly load: PreviewLoader,
    private readonly update: (
      state: PreviewSessionState<Candidate> | undefined,
    ) => void,
    private readonly loadError: (
      target: PreviewTarget,
    ) => UnavailablePreview | undefined,
    private readonly cache = new PreviewCache(),
  ) {}

  show(candidate: Candidate): void {
    const currentGeneration = ++this.generation
    this.activeLoad?.abort()
    this.activeLoad = undefined

    const key = this.cacheKey(candidate.target)
    const cached = this.cache.get(key)
    if (cached !== undefined) {
      this.update({ candidate, outcome: cached })
      return
    }

    const controller = new AbortController()
    this.activeLoad = controller
    void this.load(candidate.target, controller.signal)
      .then((outcome) => {
        if (controller.signal.aborted || currentGeneration !== this.generation) return
        if (outcome === undefined) {
          this.update(undefined)
          return
        }
        if (outcome.kind !== "unavailable") this.cache.set(key, outcome)
        this.update({ candidate, outcome })
      })
      .catch(() => {
        if (controller.signal.aborted || currentGeneration !== this.generation) return
        const outcome = this.loadError(candidate.target)
        this.update(
          outcome === undefined ? undefined : { candidate, outcome },
        )
      })
      .finally(() => {
        if (this.activeLoad === controller) this.activeLoad = undefined
      })
  }

  hide(): void {
    this.generation++
    this.activeLoad?.abort()
    this.activeLoad = undefined
    this.update(undefined)
  }

  dispose(): void {
    this.hide()
  }

  private cacheKey(target: PreviewTarget): string {
    return `${target.kind}:${target.value}`
  }
}
