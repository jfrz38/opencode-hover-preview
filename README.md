# opencode-link-preview

Experimental OpenCode TUI plugin for investigating link and file previews.

This repository is currently a **feasibility spike**, not a production plugin.
It tests whether OpenCode exposes enough information to identify URLs, pasted
image placeholders, file mentions, and local paths under the terminal cursor.

## Current finding

OpenCode and OpenTUI can render the intended preview contents, including
images, Markdown, source code, and terminal-dependent media. The unresolved
part is identifying the exact inline target rendered by the OpenCode host.
The public TUI plugin API does not currently expose an inline prompt or
transcript hover provider.

OpenCode already supports native image previews through:

```json
{
  "prompt": { "image_preview": true },
  "session": { "image_preview": true }
}
```

Those settings are the baseline for the `[Image 1]` scenario. See
[`docs/experiments.md`](docs/experiments.md) for the test matrix and setup.

## Development

```sh
bun install
bun test
bun run typecheck
```

The package exports a TUI-only plugin from `./tui`.
