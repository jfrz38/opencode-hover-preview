import type { PreviewContent } from "../domain/preview-content.js"

interface CacheEntry {
  readonly content: PreviewContent
  readonly expiresAt: number
}

export class PreviewCache {
  private readonly entries = new Map<string, CacheEntry>()

  constructor(
    private readonly maxEntries = 100,
    private readonly ttlMs = 5 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): PreviewContent | undefined {
    const entry = this.entries.get(key)
    if (entry === undefined) return undefined
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key)
      return undefined
    }
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.content
  }

  set(key: string, content: PreviewContent): void {
    if (content.kind === "unavailable") return
    this.entries.delete(key)
    this.entries.set(key, { content, expiresAt: this.now() + this.ttlMs })
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }
}
