export type FilePreviewFormat =
  | { readonly kind: "markdown" }
  | { readonly kind: "code"; readonly filetype: string }
  | { readonly kind: "plain" }

const FILETYPE_ALIASES: Readonly<Record<string, string>> = {
  cjs: "javascript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascriptreact",
  mjs: "javascript",
  mts: "typescript",
  ts: "typescript",
  tsx: "typescriptreact",
}

export function resolveFilePreviewFormat(language: string | undefined): FilePreviewFormat {
  if (language === undefined || language === "") return { kind: "plain" }

  const normalized = language.toLowerCase()
  if (normalized === "md" || normalized === "markdown") return { kind: "markdown" }

  return {
    kind: "code",
    filetype: FILETYPE_ALIASES[normalized] ?? normalized,
  }
}
