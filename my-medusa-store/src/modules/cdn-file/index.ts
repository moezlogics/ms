import { ModuleProvider } from "@medusajs/framework/utils"
import CdnFileProviderService from "./service"

export default ModuleProvider("cdn", {
  services: [CdnFileProviderService],
})
