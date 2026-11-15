# Hover feasibility experiments

This document records the host feasibility findings for the focused file and
URL preview. Results are kept separate because the prompt, transcript, and file
mentions are different OpenCode surfaces.

## Important baseline

OpenCode 2.3.0 exposes TUI slots around the application, composer, prompt
footer, and file footer. It does not expose an inline prompt or transcript link
renderer. The diagnostic therefore contains an explicitly experimental adapter
that observes the OpenTUI root mouse dispatcher. A production plugin must not
claim compatibility based only on that adapter.

OpenCode has native image preview settings:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "prompt": { "image_preview": true },
  "session": { "image_preview": true }
}
```

OpenCode's native setting covers attachments. This plugin separately previews
direct local and remote image targets on hover; attachment placeholders remain
outside its scope because they cannot be mapped reliably to their content.

## Load the plugin

After `bun install`, add this repository as a TUI-only plugin in the global
`cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "C:/Users/JoseF/git/opencode-hover-preview",
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

The development environment now runs OpenCode 2.3.0, matching the plugin
contract used by this spike.

The first host test confirmed that the experimental root observer receives
mouse events. Its original block-level resolution displayed the overlay over
unrelated cells whenever the complete renderable contained one target. The
current implementation resolves the target against the exact terminal cell by
using the renderable's public line, wrapping, scroll, and text data.

## Matrix

| Surface | Input | Public target metadata | Hit granularity | Overlay safe | Result |
| --- | --- | --- | --- | --- | --- |
| Assistant response | Markdown URL with retained source/metadata | Conditional | Exact cell | Yes | Experimental |
| Assistant response | Flattened Markdown label | No | None | Yes | No-go |
| Assistant response | Plain URL | Literal target | Exact cell | Yes | Experimental |
| Assistant response | Markdown link to workspace file | Conditional | Exact cell | Yes | Experimental |
| Assistant response | Direct public image URL | Literal/conditional | Exact cell | Yes | Experimental |
| Prompt | Pasted HTTP(S) URL | Literal target | Exact cell | Yes | Experimental |
| Prompt | `@README.md` | Literal target | Exact cell | Yes | Experimental |
| Prompt | `@image.png` | Literal target | Exact cell | Yes | Experimental |
| Sent user message | HTTP(S) URL/`@file`/local file link | Pending | Pending | Pending | Pending |

## Protocol

For each supported row:

1. Hover without moving until the configured delay elapses.
2. Record the diagnostic renderable class, ID, bounds, target kind, and
   resolution level. Do not record prompt or message text.
3. Repeat after wrapping the content, scrolling it, resizing the terminal, and
   switching `session.markdown` between `source` and `rendered`.
4. Confirm that selection, click, wheel, and keyboard input still work.
5. Reload the plugin and repeat once.

`exact-cell` means that the pointer cell intersects the displayed range of the
reported target. Several targets in one renderable are supported. The global
mouse observation is still experimental because OpenCode does not publish a
plugin-level hover provider.

Rendered Markdown needs an additional workaround. OpenTUI keeps the Markdown
source on the hit renderable while concealing link syntax visually, and does
not expose the native link metadata there. The spike projects supported inline
Markdown through `marked` and reports `markdown-projection` as the target
source. This covers ordinary links, emphasis, inline code, escapes, and line
breaks. Unknown inline token types fail closed instead of estimating a wrong
range.

As a negative check, hover menus, empty space, ordinary prose, plain local
paths, `[Image N]`, `[Pasted ~N lines]`, and unsupported link schemes. No
overlay should appear in those locations.

## Confirmed host limitations

A flattened Markdown hyperlink was inspected using the temporary unresolved
target probe. Its renderable retained only the visible label: it had no
Markdown ancestor, linked chunks, extmarks, or width difference indicating
concealed source. The OSC 8 destination is not available through the observed
OpenTUI API. The plugin therefore fails closed rather than inferring a URL from
the label.

The extmark intersecting `[Pasted ~3 lines]` was a virtual `prompt-part` with no
metadata. The placeholder can be identified precisely, but its original content
cannot be recovered. A pasted-content preview requires a future OpenCode
composer API or metadata that contains the original text. The current session
API can expose attachments after a message is sent, but does not provide a
reliable inline-hover identity for composer placeholders. Placeholder previews
were removed rather than presenting incomplete behavior.

The temporary unresolved probe was removed after collecting this evidence.
Ordinary text no longer activates the overlay.

## Decision labels

- **Stable:** exact destination from a documented public API.
- **Conditional:** useful only under a stated restriction, such as one target
  per renderable or activation by keyboard/selection.
- **Experimental:** requires the root observer or host renderable details.
- **No-go:** destination cannot be identified or the overlay breaks normal TUI
  interaction.
