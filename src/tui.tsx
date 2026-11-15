import { Plugin } from "@opencode/plugin/tui"
import { parseOptions } from "./options.js"
import { PreviewOverlay } from "./ui/preview-overlay.js"

export default Plugin.define({
  id: "opencode-hover-preview",
  setup(context) {
    const options = parseOptions(context.options)
    if (!options.enabled) return

    return context.ui.slot({
      append: "app",
      render: () => (
        <PreviewOverlay
          delayMs={options.hoverDelayMs}
          workspace={context.location?.directory}
          sources={options.sources}
          display={options.display}
        />
      ),
    })
  },
})
