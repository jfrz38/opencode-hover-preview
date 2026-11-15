export type PreviewContent =
  | {
      readonly kind: "image"
      readonly title: string
      readonly location: string
      readonly mime: "image/png" | "image/jpeg" | "image/gif" | "image/webp"
      readonly data: Uint8Array
    }
  | {
      readonly kind: "file"
      readonly title: string
      readonly path: string
      readonly body: string
      readonly language?: string
      readonly truncated: boolean
    }
  | {
      readonly kind: "url"
      readonly title: string
      readonly host: string
      readonly description?: string
      readonly url: string
    }
  | {
      readonly kind: "unavailable"
      readonly title: string
      readonly description: string
    }
