# opencode-link-preview

Experimental OpenCode TUI plugin that shows contextual file and URL previews
when the pointer rests on a supported inline target.

## Supported previews

| Target | Preview |
| --- | --- |
| Public HTTP(S) URL | Page title, host, description, and sanitized URL |
| `@file` mention | Text excerpt from the workspace file |
| Markdown link to a workspace file | File name, relative path, and text excerpt |

HTTP(S) and local Markdown links work when OpenCode retains their source or link
metadata. A flattened OSC 8 label whose destination has already been discarded
cannot be previewed. Plain local paths are intentionally not detected; use an
`@file` mention or a Markdown link.

The plugin uses an experimental OpenTUI mouse adapter because OpenCode does not
currently publish an inline hover provider. Treat compatibility as provisional.

## Install for local development

Install dependencies:

```sh
bun install
```

Reference the package from the OpenCode TUI configuration:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "C:/path/to/opencode-link-preview",
      "options": {
        "enabled": true,
        "hoverDelayMs": 500,
        "urlPreview": true,
        "filePreview": true
      }
    }
  ]
}
```

Run `/reload` after changing the plugin or its configuration.

## Options

- `enabled`: enables the plugin; defaults to `true`.
- `hoverDelayMs`: delay before loading a preview; defaults to `500` and is
  clamped between `0` and `10000`.
- `urlPreview`: allows HTTP(S) metadata requests; defaults to `true`.
- `filePreview`: allows workspace file reads; defaults to `true`.

`diagnostic: false` remains accepted as a legacy alias for `enabled: false`.

## Security boundaries

File previews:

- stay inside the current workspace, including after resolving symlinks;
- accept `@file` mentions and local Markdown link destinations;
- ignore a local link's query string and fragment when resolving its file;
- reject `file://`, unsupported URI schemes, and plain unlinked paths;
- read at most 64 KiB;
- reject directories, binary data, and invalid UTF-8;
- show at most 20 lines and 4,000 characters.

URL previews:

- accept only HTTP(S) on standard ports without embedded credentials;
- reject DNS results in loopback, private, link-local, documentation, multicast,
  and other non-public ranges;
- revalidate up to three manual redirects;
- time out after three seconds;
- accept only HTML and read at most 256 KiB;
- extract text metadata without executing or rendering remote HTML.

DNS validation reduces accidental access to local services but is not a complete
defense against DNS rebinding because the local runtime resolves the hostname
again for the request. Localhost and private-network HTTP(S) URLs are not
supported. Set `urlPreview` to `false` when network access must be prohibited.

## Native image previews

OpenCode can display images independently of this plugin:

```json
{
  "prompt": { "image_preview": true },
  "session": { "image_preview": true }
}
```

Image placeholders and pasted-content placeholders are outside this plugin's
scope. OpenCode does not expose a reliable inline-hover mapping from those
placeholders to their original content; pasted composer content is unavailable,
and images already have the native preview above.

## Development

```sh
bun test
bun run typecheck
git diff --check
```

See [`docs/architecture.md`](docs/architecture.md) for the internal boundaries
and [`docs/experiments.md`](docs/experiments.md) for host feasibility findings.
