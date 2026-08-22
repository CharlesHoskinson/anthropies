import { layerAPack } from "../packs/layer-a.js"
import { c2paPack } from "../packs/c2pa.js"
import { pdfPack } from "../packs/pdf.js"
import { htmlPack } from "../packs/html.js"
import { mdPack } from "../packs/md.js"
import { svgStripPack } from "../packs/svg-strip.js"
import { docxPack } from "../packs/docx.js"
import { odtPack } from "../packs/odt.js"
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
  return registry
}
