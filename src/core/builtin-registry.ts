import { layerAPack } from "../packs/layer-a.js"
import { c2paPack } from "../packs/c2pa.js"
import { pdfPack } from "../packs/pdf.js"
import { htmlPack } from "../packs/html.js"
import { mdPack } from "../packs/md.js"
import { svgStripPack } from "../packs/svg-strip.js"
import { docxPack } from "../packs/docx.js"
import { odtPack } from "../packs/odt.js"
import { rasterStripPack } from "../packs/raster-strip.js"
import { pdfToolsPack } from "../packs/pdf-tools.js"
import { markllmPack } from "../packs/markllm.js"
import { markDiffusionPack } from "../packs/markdiffusion.js"
import { ctrlRegenPack } from "../packs/ctrlregen.js"
import { createRegistry, type PackRegistry } from "./registry.js"

/** Register the core packs for Inspector and Cleaner. */
export const builtinRegistry = (): PackRegistry => {
  const registry = createRegistry()
  registry.register(layerAPack)
  registry.register(c2paPack)
  registry.register(pdfPack)
  registry.register(htmlPack)
  registry.register(mdPack)
  registry.register(svgStripPack)
  registry.register(docxPack)
  registry.register(odtPack)
  registry.register(rasterStripPack)
  registry.register(pdfToolsPack)
  registry.register(markllmPack)
  registry.register(markDiffusionPack)
  registry.register(ctrlRegenPack)
  return registry
}
