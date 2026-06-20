import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"

/**
 * POST /store/auth/google-link
 * 
 * Verifies a Google OAuth callback token, extracts the email, and links
 * the Google AuthIdentity to an existing Customer with the same email if found.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({ message: "Authorization header with Bearer token is required" })
  }

  const token = authHeader.substring(7)
  const jwtSecret = process.env.JWT_SECRET || "15afa7452e440137afbb3e3c0d48e653ef91d3fe422ded68e60e5b71cc76f32c4a708f43367f5ff512e7a1dfcd392f13"

  let decoded: any
  try {
    decoded = jwt.verify(token, jwtSecret)
  } catch (error: any) {
    return res.status(401).json({ message: "Invalid or expired token", error: error?.message })
  }

  const authIdentityId = decoded.auth_identity_id
  if (!authIdentityId) {
    return res.status(400).json({ message: "Token does not contain auth_identity_id" })
  }

  const userMeta = decoded.user_metadata || {}
  const appMeta = decoded.app_metadata || {}
  const googleMeta = appMeta.google || {}

  const email =
    userMeta.email ||
    googleMeta.email ||
    decoded.email ||
    appMeta.email ||
    null

  if (!email) {
    return res.status(400).json({ message: "Token does not contain an email address" })
  }

  const customerModuleService = req.scope.resolve(Modules.CUSTOMER) as any
  const customers = await customerModuleService.listCustomers({ email })

  if (customers.length === 0) {
    return res.json({ linked: false, message: "No customer exists with this email address" })
  }

  const customer = customers[0]

  // Link the auth identity to the existing customer
  const authModuleService = req.scope.resolve(Modules.AUTH) as any
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK) as any

  // Update app_metadata with customer_id
  await authModuleService.updateAuthIdentities([
    {
      id: authIdentityId,
      app_metadata: {
        customer_id: customer.id,
      },
    },
  ])

  // Create remote link between AuthIdentity and Customer
  try {
    await link.create({
      [Modules.AUTH]: {
        auth_identity_id: authIdentityId,
      },
      [Modules.CUSTOMER]: {
        customer_id: customer.id,
      },
    })
  } catch (linkError) {
    // Already linked or unique constraint, safe to ignore
  }

  return res.json({ linked: true, customer_id: customer.id })
}
