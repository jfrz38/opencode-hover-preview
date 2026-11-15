# opencode-hover-preview

Experimental OpenCode TUI plugin that shows contextual file and URL previews
when the pointer rests on a supported inline target.

## Supported previews

| Target | Preview |
| --- | --- |
| Public HTTP(S) URL | Page title and description |
| `@file` mention | Formatted workspace file excerpt |
| Markdown link to a workspace file | Formatted workspace file excerpt |
| `@image` mention or Markdown link to an image | Bounded PNG, JPEG, GIF, or WebP image |
| Direct public HTTP(S) image URL | Bounded PNG, JPEG, GIF, or WebP image |

HTTP(S) and local Markdown links work when OpenCode retains their source or link
metadata. A flattened OSC 8 label whose destination has already been discarded
cannot be previewed. Plain local paths are intentionally not detected; use an
`@file` mention or a Markdown link.

The plugin uses an experimental OpenTUI mouse adapter because OpenCode does not
currently publish an inline hover provider. Treat compatibility as provisional.

## Install for local development

Install dependencies:

```sh
make install
```

Reference the package from the OpenCode TUI configuration:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "C:/path/to/opencode-hover-preview",
      "options": {
        "enabled": true,
        "hoverDelayMs": 500,
        "sources": {
          "url": true,
          "file": true,
          "image": true
        },
        "display": {
          "showDetails": false,
          "width": 70,
          "minHeight": 4,
          "maxHeight": 16
        }
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
- `sources.url`: shows previews for HTTP(S) pages; defaults to `true`. Turning
  it off does not hide remote images when `sources.image` is enabled.
- `sources.file`: shows previews for workspace text files; defaults to `true`.
  Turning it off does not hide local images when `sources.image` is enabled.
- `sources.image`: shows supported local and remote images; defaults to `true`.
  Turning it off does not affect HTTP(S) pages or text files.
- `display.showDetails`: adds target diagnostics and metadata such as file
  paths, image locations, URL hosts, and sanitized URLs; defaults to `false`.
- `display.width`: desired preview width in terminal columns; defaults to `70`.
  It is reduced automatically when the terminal is narrower.
- `display.minHeight`: minimum preview height in terminal rows; defaults to `4`.
- `display.maxHeight`: maximum preview height in terminal rows; defaults to
  `16`.
  The preview remains content-sized within this range and is reduced
  automatically when the terminal is shorter.

Preview dimensions accept positive integers. Values below the renderable
minimum are raised, fractional values are rounded down, and
`display.maxHeight` is raised when necessary to match `display.minHeight`.

Previews use a compact presentation by default: files show their formatted
content, images show the image, and URLs show the fetched title and description.
Set `display.showDetails` to `true` to restore the complete metadata display.

`diagnostic: false` remains accepted as a legacy alias for `enabled: false`.

## Security boundaries

File previews:

- stay inside the current workspace, including after resolving symlinks;
- accept `@file` mentions and local Markdown link destinations;
- ignore a local link's query string and fragment when resolving its file;
- reject `file://`, unsupported URI schemes, and plain unlinked paths;
- read at most 64 KiB;
- read supported images up to 10 MiB and validate their binary signature;
- reject directories and silently ignore unsupported binary data or invalid
  UTF-8;
- show at most 20 lines and 4,000 characters.

URL previews:

- accept only HTTP(S) on standard ports without embedded credentials;
- reject DNS results in loopback, private, link-local, documentation, multicast,
  and other non-public ranges;
- revalidate up to three manual redirects;
- time out after three seconds;
- accept only HTML and silently ignore other document formats; read at most
  256 KiB;
- accept PNG, JPEG, GIF, and WebP only when the response MIME matches its
  binary signature, and read at most 10 MiB;
- extract text metadata without executing or rendering remote HTML.

DNS validation reduces accidental access to local services but is not a complete
defense against DNS rebinding because the local runtime resolves the hostname
again for the request. Localhost and private-network HTTP(S) URLs are not
supported. Set both `sources.url` and `sources.image` to `false` when network
access must be prohibited. Set both `sources.file` and `sources.image` to
`false` when workspace file reads must be prohibited.

## Formatted file previews

Markdown files render as terminal Markdown, including headings, lists, emphasis,
tables, and fenced code blocks. This is a terminal representation rather than
an exact reproduction of GitHub's HTML rendering.

Other files use OpenTUI's native syntax highlighter. Common extension aliases
such as `.js`, `.jsx`, `.ts`, and `.tsx` are mapped to their canonical
filetypes. OpenTUI 0.8.4 includes parsers for JavaScript, TypeScript, TSX,
Markdown, and Zig. If no parser recognizes an extension, the original text is
still shown without syntax colors.

## Image previews

This plugin renders supported image targets in the hover overlay through
OpenTUI. OpenTUI chooses Kitty, Sixel, or a terminal-block fallback according
to terminal capabilities. GIF animation is not guaranteed.

OpenCode can also display image attachments independently of this plugin:

```json
{
  "prompt": { "image_preview": true },
  "session": { "image_preview": true }
}
```

Attachment placeholders such as `[Image N]` and pasted-content placeholders
remain outside this plugin's scope. OpenCode does not expose a reliable
inline-hover mapping from those placeholders to their original content, and
pasted composer content is unavailable to the plugin.

## Development

Run all project checks:

```sh
make check
```

Run the build validation or tests individually:

```sh
make build
make test
```

`make build` checks the TypeScript types without emitting artifacts.

See [`docs/architecture.md`](docs/architecture.md) for the internal boundaries
and [`docs/experiments.md`](docs/experiments.md) for host feasibility findings.
