import {
  createStep,
  StepResponse
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CartDTO, CustomerDTO } from "@medusajs/framework/types"
import { buildEmailThemeFromSettings } from "../../modules/email-notifications/util/theme-from-settings"

type SendAbandonedNotificationsStepInput = {
  carts: (CartDTO & {
    customer?: CustomerDTO
  })[]
}

/**
 * Step: Send abandoned cart email notifications.
 *
 * Uses our custom "abandoned-cart" SMTP template instead of SendGrid.
 */
export const sendAbandonedNotificationsStep = createStep(
  "send-abandoned-notifications",
  async (input: SendAbandonedNotificationsStepInput, { container }) => {
    const notificationModuleService = container.resolve(
      Modules.NOTIFICATION
    )

    // Pull branding from site settings; fall back to env / defaults.
    // Module is registered as `site_settings` (underscore). The old
    // hyphenated lookup threw and was swallowed, so abandoned-cart
    // emails went out unbranded/unthemed.
    let settings: Record<string, string> = {}
    try {
      const settingsModule = container.resolve("site_settings") as any
      if (settingsModule?.getAll) {
        settings = await settingsModule.getAll()
      }
    } catch {
      // Site settings module unavailable
    }

    const storeUrl =
      settings.store_url ||
      process.env.STORE_URL ||
      process.env.STORE_CORS?.split(",")[0] ||
      "http://localhost:3060"
    const storeName =
      settings.site_name ||
      process.env.STORE_NAME ||
      process.env.MEDUSA_STORE_NAME ||
      "Welcome"
    const logoUrl = settings.site_logo_url || undefined
    const copyright = settings.footer_copyright || undefined
    const theme = buildEmailThemeFromSettings(settings)

    const notificationData = input.carts.map((cart) => ({
      to: cart.email!,
      channel: "email",
      template: "abandoned-cart",
      data: {
        first_name: cart.customer?.first_name || cart.shipping_address?.first_name || "there",
        store_name: storeName,
        logo_url: logoUrl,
        copyright,
        theme,
        cart_url: `${storeUrl}/cart`,
        items: cart.items?.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          thumbnail: item.thumbnail,
        })) || [],
      }
    }))

    const notifications = await notificationModuleService.createNotifications(
      notificationData
    )

    return new StepResponse({
      notifications
    })
  }
)
