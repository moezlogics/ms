import { ExecArgs } from "@medusajs/framework/types"

export default async function ({ container }: ExecArgs) {
  const manager: any = container.resolve("__pg_connection__")
  const result = await manager.raw(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  )
  const rows = result.rows || result
  console.log(`TABLE_COUNT=${rows.length}`)
  for (const r of rows) console.log(`T: ${r.tablename}`)
}
