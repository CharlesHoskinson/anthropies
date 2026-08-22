import { c2paPack } from "../packs/c2pa.js"
import { layerAPack } from "../packs/layer-a.js"
import { pdfPack } from "../packs/pdf.js"
import { svgStripPack } from "../packs/svg-strip.js"
import { createRegistry, type PackRegistry } from "./registry.js"

/** Register the core packs for Inspector and Cleaner. */
export const builtinRegistry = (): PackRegistry => {
  const registry = createRegistry()
  registry.register(layerAPack)
  registry.register(c2paPack)
  registry.register(pdfPack)
  registry.register(svgStripPack)
  return registry
}
