import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

/**
 * GET /store/customers/me/loyalty-transactions
 *
 * Returns the authenticated customer's loyalty point history (newest
 * first). Used by the storefront account → Loyalty section to render
 * the transaction list.
 *
 * ?take=50 — page size (default 50, max 200)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const svc: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const customerId = req.auth_context.actor_id

  const take = Math.min(Number(req.query.take) || 50, 200)

  const [balance, transactions] = await Promise.all([
    svc.getPoints(customerId),
    svc.listTransactionsForCustomer(customerId, take),
  ])

  res.json({
    balance,
    transactions,
  })
}
