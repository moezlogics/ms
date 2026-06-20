import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

/**
 * POST /store/customers/me/claim-completion-reward
 *
 * Idempotent loyalty reward for completing the onboarding profile.
 *
 * The storefront calls this once the customer hits 100% — meaning
 * email + first/last name + phone + at least one address are all
 * filled in. We mirror the same definition the dashboard uses so
 * users can't trick the route by saving the form half-empty.
 *
 * Awards a flat REWARD_POINTS one time. The flag goes on the
 * customer's `metadata.profile_completion_rewarded_at` so a re-check
 * never double-credits even if the storefront fires the call twice.
 *
 * Response shape:
 *   {
 *     rewarded: boolean,        // true the moment we credited points
 *     points_granted: number,   // 0 unless rewarded === true
 *     balance: number,          // current loyalty balance after credit
 *     completion: number,       // 0..100 — useful for the UI bar
 *     already_claimed: boolean, // had been rewarded before this call
 *   }
 */

const REWARD_POINTS = 10
const META_KEY = "profile_completion_rewarded_at"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER) as any
  const loyaltyModuleService: LoyaltyModuleService =
    req.scope.resolve(LOYALTY_MODULE)

  // Pull the customer + addresses; we need both to compute completion
  // the same way the storefront dashboard does.
  const customer = await customerModuleService.retrieveCustomer(customerId, {
    relations: ["addresses"],
  })

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const completion = computeCompletion(customer)

  const alreadyClaimed = !!customer.metadata?.[META_KEY]
  const balance = await loyaltyModuleService.getPoints(customerId)

  if (completion < 100) {
    return res.json({
      rewarded: false,
      points_granted: 0,
      balance,
      completion,
      already_claimed: alreadyClaimed,
    })
  }

  if (alreadyClaimed) {
    return res.json({
      rewarded: false,
      points_granted: 0,
      balance,
      completion,
      already_claimed: true,
    })
  }

  // Credit + flag the customer so retries are no-ops.
  const updated = await loyaltyModuleService.addPoints(
    customerId,
    REWARD_POINTS,
    {
      kind: "earn",
      description: "Profile setup completed",
    }
  )

  await customerModuleService.updateCustomers(customerId, {
    metadata: {
      ...(customer.metadata || {}),
      [META_KEY]: new Date().toISOString(),
    },
  })

  return res.json({
    rewarded: true,
    points_granted: REWARD_POINTS,
    balance: updated.points,
    completion,
    already_claimed: false,
  })
}

/**
 * Mirrors `getProfileCompletion()` in
 * src/modules/account/components/overview-modern/index.tsx so the
 * server reward gate matches what the user sees on screen.
 *   - email
 *   - first_name + last_name
 *   - phone
 *   - gender (metadata.gender — collected in the onboarding wizard,
 *             powers the push-campaign gender filter)
 *   - default billing address (or any address — see notes)
 *
 * Keep this in sync with the storefront helper when you change steps.
 */
function computeCompletion(customer: any): number {
  if (!customer) return 0
  let count = 0
  const total = 5

  if (customer.email) count++
  if (customer.first_name && customer.last_name) count++
  if (customer.phone) count++
  if (
    customer.metadata &&
    typeof customer.metadata.gender === "string" &&
    customer.metadata.gender.trim()
  ) {
    count++
  }

  const addresses = customer.addresses || []
  const hasAddress =
    addresses.some((a: any) => a.is_default_billing) || addresses.length > 0
  if (hasAddress) count++

  return Math.round((count / total) * 100)
}
