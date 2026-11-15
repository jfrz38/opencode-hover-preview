import type { PreviewContent, PreviewOutcome } from "./preview-content.js"
import type { PreviewTarget } from "./preview-target.js"

export interface PreviewSourceSelectionInput {
  readonly url: boolean
  readonly file: boolean
  readonly image: boolean
}

export class PreviewSourceSelection {
  readonly #url: boolean
  readonly #file: boolean
  readonly #image: boolean

  constructor(input: PreviewSourceSelectionInput) {
    this.#url = input.url
    this.#file = input.file
    this.#image = input.image
  }

  canLoad(target: PreviewTarget): boolean {
    return target.kind === "url"
      ? this.#url || this.#image
      : this.#file || this.#image
  }

  allows(outcome: PreviewOutcome, target: PreviewTarget): boolean {
    if (outcome.kind === "failure") return this.allowsOrigin(target)
    return this.allowsContent(outcome)
  }

  allowsOrigin(target: PreviewTarget): boolean {
    return target.kind === "url" ? this.#url : this.#file
  }

  allowsImage(): boolean {
    return this.#image
  }

  private allowsContent(content: PreviewContent): boolean {
    switch (content.kind) {
      case "url":
        return this.#url
      case "file":
        return this.#file
      case "image":
        return this.#image
    }
  }
}
