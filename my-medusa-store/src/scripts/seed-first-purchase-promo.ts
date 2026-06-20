import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FIRST_PURCHASE_PROMOTION_CODE } from "../constants"

/**
 * Seed script: Creates the FIRST_PURCHASE promotion if it doesn't exist.
 *
 * Usage:
 *   npx medusa exec src/scripts/seed-first-purchase-promo.ts
 *
 * This creates a 10% off promotion for first-time customers.
 * The apply-first-purchase subscriber will auto-attach it to carts.
 */
export default async function seedFirstPurchasePromo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any

  // Check if promo already exists
  const existing = await promotionModule.listPromotions({
    code: FIRST_PURCHASE_PROMOTION_CODE,
  })

  if (existing.length > 0) {
    logger.info(`[FirstPurchase] Promotion "${FIRST_PURCHASE_PROMOTION_CODE}" already exists — skipping.`)
    return
  }

  const promo = await promotionModule.createPromotions({
    code: FIRST_PURCHASE_PROMOTION_CODE,
    is_automatic: true,
    type: "standard",
    status: "active",
    application_method: {
      type: "percentage",
      target_type: "order",
      value: 10, // 10% off entire order
    },
  })

  logger.info(`[FirstPurchase] ✅ Created promotion: ${FIRST_PURCHASE_PROMOTION_CODE} (10% off first order)`)
}
