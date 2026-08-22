import { c2paPack } from "../packs/c2pa.js"
import { htmlPack } from "../packs/html.js"
import { layerAPack } from "../packs/layer-a.js"
import { mdPack } from "../packs/md.js"
import { pdfPack } from "../packs/pdf.js"
import { createRegistry, type PackRegistry } from "./registry.js"

/** Register the core packs for Inspector and Cleaner. */
export const builtinRegistry = (): PackRegistry => {
  const registry = createRegistry()
  registry.register(layerAPack)
  registry.register(c2paPack)
  registry.register(pdfPack)
  registry.register(htmlPack)
  registry.register(mdPack)
  return registry
}
