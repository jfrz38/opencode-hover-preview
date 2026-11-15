import type { PreviewContent } from "../../core/preview-content.js"

interface CacheEntry {
  readonly content: PreviewContent
  readonly expiresAt: number
  readonly bytes: number
}

export interface PreviewCacheOptions {
  readonly maxEntries?: number
  readonly ttlMs?: number
  readonly now?: () => number
  readonly maxBytes?: number
}

export class PreviewCache {
  private readonly entries = new Map<string, CacheEntry>()
  private totalBytes = 0
  private readonly maxEntries: number
  private readonly ttlMs: number
  private readonly now: () => number
  private readonly maxBytes: number

  constructor(options: PreviewCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 100
    this.ttlMs = options.ttlMs ?? 5 * 60_000
    this.now = options.now ?? Date.now
    this.maxBytes = options.maxBytes ?? 32 * 1024 * 1024
  }

  private delete(key: string): void {
    const entry = this.entries.get(key)
    if (entry === undefined) return
    this.totalBytes -= entry.bytes
    this.entries.delete(key)
  }

  get(key: string): PreviewContent | undefined {
    const entry = this.entries.get(key)
    if (entry === undefined) return undefined
    if (entry.expiresAt <= this.now()) {
      this.delete(key)
      return undefined
    }
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.content
  }

  set(key: string, content: PreviewContent): void {
    const bytes = content.kind === "image" ? content.data.byteLength : 0
    this.delete(key)
    if (bytes > this.maxBytes) return
    this.entries.set(key, { content, expiresAt: this.now() + this.ttlMs, bytes })
    this.totalBytes += bytes
    while (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.delete(oldest)
    }
  }
}
