import { MedusaContainer } from "@medusajs/framework/types"
import { sendAbandonedCartsWorkflow, SendAbandonedCartsWorkflowInput } from "../workflows/send-abandoned-carts"

/**
 * Daily abandoned-cart sweep.
 *
 * Picks up carts that:
 *   - haven't been touched for >= 24h
 *   - have a usable email (not null AND not empty string)
 *   - aren't completed
 *   - still have items
 *   - haven't already received an abandoned-cart email
 *
 * Logs a structured breakdown per page so we can see *why* a cart
 * was skipped without grepping. The previous implementation logged
 * only the final "sent N" total, hiding the case where 0 emails
 * went out because every cart was filtered for a recoverable reason
 * (e.g. all emails were empty strings, which the `$ne: null` check
 * lets through).
 */
export default async function abandonedCartJob(
  container: MedusaContainer
) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")

  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  // oneDayAgo.setMinutes(oneDayAgo.getMinutes() - 1) // For testing
  const limit = 100
  let offset = 0
  let totalCount = 0
  let abandonedCartsCount = 0
  let skippedNoEmail = 0
  let skippedNoItems = 0
  let skippedAlreadyNotified = 0
  let workflowFailures = 0

  logger.info(`[AbandonedCart] Starting sweep: cutoff=${oneDayAgo.toISOString()}`)

  do {
    const {
      data: abandonedCarts,
      metadata
    } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "items.*",
        "metadata",
        "customer.*",
        "shipping_address.*"
      ],
      filters: {
        updated_at: {
          $lt: oneDayAgo
        },
        email: {
          $ne: null
        },
        completed_at: null,
      },
      pagination: {
        skip: offset,
        take: limit
      }
    })

    totalCount = metadata?.count ?? 0

    // Apply the in-memory filters and tally each skip reason so the
    // operator can debug without rerunning. `$ne: null` doesn't catch
    // empty strings (Medusa stores those in some cart flows) so we
    // re-validate here.
    const cartsWithItems = abandonedCarts.filter((cart: any) => {
      const hasEmail = typeof cart.email === "string" && cart.email.trim().length > 0
      const hasItems = (cart.items?.length || 0) > 0
      const alreadyNotified = !!cart.metadata?.abandoned_notification

      if (!hasEmail) {
        skippedNoEmail++
        return false
      }
      if (!hasItems) {
        skippedNoItems++
        return false
      }
      if (alreadyNotified) {
        skippedAlreadyNotified++
        return false
      }
      return true
    })

    if (cartsWithItems.length > 0) {
      try {
        await sendAbandonedCartsWorkflow(container).run({
          input: {
            carts: cartsWithItems
          } as unknown as SendAbandonedCartsWorkflowInput
        })
        abandonedCartsCount += cartsWithItems.length
      } catch (error: any) {
        workflowFailures++
        // Surface the real reason. The previous handler did
        // `error.message` only — if `error` was a string, that
        // returned `undefined` and the operator saw
        // "Failed to send abandoned cart notification: undefined".
        const reason = error?.message || (typeof error === "string" ? error : JSON.stringify(error))
        logger.error(
          `[AbandonedCart] Workflow failed for ${cartsWithItems.length} carts: ${reason}`
        )
        if (error?.stack) {
          logger.error(`[AbandonedCart] stack: ${error.stack.split("\n").slice(0, 5).join(" | ")}`)
        }
      }
    }

    offset += limit
  } while (offset < totalCount)

  logger.info(
    `[AbandonedCart] Done. sent=${abandonedCartsCount} ` +
      `skipped_no_email=${skippedNoEmail} ` +
      `skipped_no_items=${skippedNoItems} ` +
      `skipped_already_notified=${skippedAlreadyNotified} ` +
      `workflow_failures=${workflowFailures} ` +
      `total_scanned=${totalCount}`
  )
}

export const config = {
  name: "abandoned-cart-notification",
  schedule: "0 0 * * *" // Run at midnight every day
  // schedule: "* * * * *" // Run every minute for testing
}
