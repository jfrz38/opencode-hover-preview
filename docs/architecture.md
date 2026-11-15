# Architecture

The plugin is deliberately small. Its boundaries isolate the unstable host
integration without introducing a framework or dependency-injection container.

## Modules

- `src/domain`: target classification and preview value types plus deterministic
  hover and overlay behavior.
- `src/opentui`: the experimental mouse adapter, renderable inspection,
  Markdown projection, and terminal-cell hit testing.
- `src/preview`: bounded file and URL loaders, capability coordination, and the
  in-memory cache.
- `src/ui`: Solid/OpenTUI rendering and hover lifecycle.
- `src/tui.tsx`: plugin composition and OpenCode context wiring.

Dependencies point from the host adapter and UI toward neutral domain values.
The file and URL loaders do not import Solid or OpenTUI, so their security
boundaries are testable without a terminal.

## Request lifecycle

1. The OpenTUI adapter observes a mouse event without consuming it.
2. The renderable inspector resolves a target only when the exact terminal cell
   intersects its displayed range. Link metadata and projected Markdown share
   one classifier for public HTTP(S) and workspace-file destinations.
3. The hover delay starts one cancelable preview load.
4. The loader returns a bounded `PreviewContent` value. Images are accepted
   only for supported signatures, with remote MIME agreement.
5. The UI renders text or a bounded OpenTUI image and caches only successful
   results in memory. Image bytes share a 32 MiB LRU budget.
6. Leaving the target, scrolling, changing targets, or unloading aborts the
   active operation and invalidates late results.

## Experimental boundary

`observeRootMouse` wraps `root.processMouseEvent` because OpenCode has no public
inline hover API. It preserves the original dispatcher and restores it on
cleanup, but an OpenTUI internal change can still break this adapter. All code
that depends on that behavior lives in `src/opentui`.
