import { layerAPack } from "../packs/layer-a.js"
import { c2paPack } from "../packs/c2pa.js"
import { pdfPack } from "../packs/pdf.js"
import { htmlPack } from "../packs/html.js"
import { mdPack } from "../packs/md.js"
import { rasterStripPack } from "../packs/raster-strip.js"
import { pdfToolsPack } from "../packs/pdf-tools.js"
import { createRegistry, type PackRegistry } from "./registry.js"

/** Register the core packs for Inspector and Cleaner. */
export const builtinRegistry = (): PackRegistry => {
  const registry = createRegistry()
  registry.register(layerAPack)
  registry.register(c2paPack)
  registry.register(pdfPack)
  registry.register(htmlPack)
  registry.register(mdPack)
  registry.register(rasterStripPack)
  registry.register(pdfToolsPack)
  return registry
}
