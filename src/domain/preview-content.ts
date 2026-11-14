export type PreviewContent =
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
      readonly kind: "placeholder"
      readonly placeholder: "image" | "pasted"
      readonly title: string
      readonly description: string
    }
  | {
      readonly kind: "unavailable"
      readonly title: string
      readonly description: string
    }
