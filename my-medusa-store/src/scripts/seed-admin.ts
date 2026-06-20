/**
 * Admin user seed script.
 *
 * Idempotent: safe to run on a fresh database OR an existing one. If the
 * user already exists the password is reset to the value below.
 *
 * Run via:
 *   npx medusa exec ./src/scripts/seed-admin.ts
 *
 * Override defaults with env vars:
 *   SEED_ADMIN_EMAIL=foo@bar.pk SEED_ADMIN_PASSWORD='Secret!' npx medusa exec ./src/scripts/seed-admin.ts
 *
 * Why this script and not `npx medusa user`?
 * - The CLI parses `!` and other shell metacharacters, which breaks
 *   passwords like `Multanpakistan1!` unless quoted carefully.
 * - This script bypasses the shell entirely and goes through the same
 *   auth-module + user-module path the admin login uses, so the result
 *   is identical to creating the user from the admin UI.
 */

import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "logicalmoez@gmail.com"
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Multanpakistan1!"
const ADMIN_FIRST_NAME = process.env.SEED_ADMIN_FIRST_NAME || "Admin"
const ADMIN_LAST_NAME = process.env.SEED_ADMIN_LAST_NAME || "User"

export default async function seedAdmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const userModule: any = container.resolve(Modules.USER)
  const authModule: any = container.resolve(Modules.AUTH)

  logger.info(`[seed-admin] Ensuring admin user: ${ADMIN_EMAIL}`)

  // 1. Ensure user row exists ----------------------------------------------
  const existingUsers = await userModule.listUsers({ email: ADMIN_EMAIL })
  let user = existingUsers?.[0]

  if (!user) {
    const created = await userModule.createUsers({
      email: ADMIN_EMAIL,
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
    })
    user = Array.isArray(created) ? created[0] : created
    logger.info(`[seed-admin] Created user record: ${user.id}`)
  } else {
    logger.info(`[seed-admin] User already exists: ${user.id}`)
  }

  // 2. Ensure auth_identity exists with the desired password ---------------
  // We use the emailpass provider's `register` (= create new) or
  // `updateProvider` (= reset password). Both go through the same
  // scrypt hashing path the live login uses, so the resulting hash is
  // 100% compatible with admin sign-in.
  const registerInput = {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  } as any

  let authIdentityId: string | null = null

  try {
    const reg = await authModule.register("emailpass", registerInput)
    if (reg?.success && reg?.authIdentity?.id) {
      authIdentityId = reg.authIdentity.id
      logger.info(`[seed-admin] Created auth identity: ${authIdentityId}`)
    } else if (!reg?.success) {
      logger.info(
        `[seed-admin] register() returned: ${reg?.error || "unknown"} — falling back to password update`
      )
    }
  } catch (e: any) {
    logger.info(`[seed-admin] register() threw: ${e?.message} — will try updateProvider`)
  }

  if (!authIdentityId) {
    // Identity already exists → update its password instead.
    try {
      const upd = await authModule.updateProvider("emailpass", registerInput)
      if (upd?.success !== false) {
        logger.info(`[seed-admin] Password reset for existing identity`)
      }
    } catch (e: any) {
      // Some Medusa versions don't expose updateProvider. Fall back to a
      // delete + re-register cycle.
      logger.warn(
        `[seed-admin] updateProvider unavailable (${e?.message}); deleting old identity and re-registering`
      )
      const ids = await authModule.listAuthIdentities({
        provider_identities: { entity_id: ADMIN_EMAIL, provider: "emailpass" },
      })
      for (const a of ids || []) {
        try {
          await authModule.deleteAuthIdentities([a.id])
        } catch {}
      }
      const reg2 = await authModule.register("emailpass", registerInput)
      if (reg2?.authIdentity?.id) {
        authIdentityId = reg2.authIdentity.id
        logger.info(`[seed-admin] Re-created auth identity: ${authIdentityId}`)
      }
    }
  }

  // 3. Look up the auth_identity (covers both "just created" and "already
  //    existed" cases) and link it to the user via app_metadata.user_id ---
  const ids = await authModule.listAuthIdentities({
    provider_identities: { entity_id: ADMIN_EMAIL, provider: "emailpass" },
  })
  const authIdentity = ids?.[0]

  if (authIdentity) {
    const currentMeta = (authIdentity.app_metadata as Record<string, unknown>) || {}
    if (currentMeta.user_id !== user.id) {
      await authModule.updateAuthIdentities({
        id: authIdentity.id,
        app_metadata: { ...currentMeta, user_id: user.id },
      })
      logger.info(`[seed-admin] Linked auth identity ${authIdentity.id} → user ${user.id}`)
    } else {
      logger.info(`[seed-admin] Auth identity already linked to user`)
    }
  } else {
    logger.error(
      `[seed-admin] Could not locate auth identity for ${ADMIN_EMAIL} after register/update — admin login will fail.`
    )
  }

  logger.info("")
  logger.info("╔════════════════════════════════════════════════════╗")
  logger.info("║          ✅  ADMIN USER READY                       ║")
  logger.info("╚════════════════════════════════════════════════════╝")
  logger.info(`  Email:    ${ADMIN_EMAIL}`)
  logger.info(`  Password: ${ADMIN_PASSWORD}`)
  logger.info(`  Login at: <MEDUSA_BACKEND_URL>/app`)
  logger.info("")
}
