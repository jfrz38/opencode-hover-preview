export interface HtmlMetadata {
  readonly title?: string
  readonly description?: string
}

function decodeEntities(value: string): string {
  const named: Readonly<Record<string, string>> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: "\"",
  }
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/giu, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10))
    return named[code.toLowerCase()] ?? entity
  })
}

function cleanText(value: string, maxLength: number): string {
  const cleaned = decodeEntities(value.replace(/<[^>]*>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim()
  const characters = [...cleaned]
  return characters.length <= maxLength
    ? cleaned
    : `${characters.slice(0, maxLength - 1).join("")}…`
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "iu"),
  )
  return match?.[1] ?? match?.[2] ?? match?.[3]
}

export function extractHtmlMetadata(html: string): HtmlMetadata {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)
  const titleText = titleMatch?.[1]
  let description: string | undefined

  for (const match of html.matchAll(/<meta\b[^>]*>/giu)) {
    const tag = match[0]
    const name = (attribute(tag, "name") ?? attribute(tag, "property"))?.toLowerCase()
    if (name === "description" || name === "og:description") {
      const content = attribute(tag, "content")
      if (content !== undefined) {
        description = cleanText(content, 300) || undefined
        break
      }
    }
  }

  const title = titleText === undefined ? undefined : cleanText(titleText, 120) || undefined
  return {
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
  }
}
