import type { LoyaltyData } from "@lib/data/loyalty"

/**
 * Loyalty points panel for the account dashboard.
 *
 * Shows the running balance prominently and a chronological list of
 * earn / redeem transactions below. Server component — gets data
 * passed in from the page.
 */
export default function LoyaltyOverview({ data }: { data: LoyaltyData | null }) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <p className="text-sm text-ink/70">
          Sign in to see your loyalty points.
        </p>
      </div>
    )
  }

  const balance = data.balance || 0
  const transactions = data.transactions || []

  return (
    <div className="flex flex-col gap-6">
      {/* Balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-6 text-primary-fg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">
              Your Balance
            </p>
            <p className="mt-2 text-4xl font-bold leading-none">
              {balance.toLocaleString()}
            </p>
            <p className="mt-1 text-sm opacity-80">
              {balance === 1 ? "point" : "points"}
            </p>
          </div>
          <div className="hidden sm:block">
            <i
              className="ph-fill ph-medal text-[72px] opacity-30"
              aria-hidden
            />
          </div>
        </div>
        <p className="mt-4 text-xs opacity-80 max-w-xs">
          Earn 1 point for every unit spent. Redeem points at checkout for
          a discount on your next order.
        </p>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-base font-semibold text-ink">
            Transaction history
          </h2>
          <p className="text-xs text-ink/60 mt-0.5">
            Recent earn and redeem activity.
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <i
              className="ph ph-receipt text-[36px] text-ink/30"
              aria-hidden
            />
            <p className="text-sm text-ink/60 mt-2">
              No transactions yet — points will appear here after your first
              completed order.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {transactions.map((tx) => {
              const positive = tx.points > 0
              const kindLabel = {
                earn: "Earned",
                redeem: "Redeemed",
                adjust: "Adjusted",
                refund: "Refunded",
              }[tx.kind] || tx.kind

              return (
                <li
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                      positive
                        ? "bg-success/15 text-success"
                        : "bg-danger/15 text-danger"
                    }`}
                  >
                    <i
                      className={`ph-bold ${
                        positive ? "ph-arrow-up" : "ph-arrow-down"
                      } text-[14px]`}
                      aria-hidden
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {tx.description || kindLabel}
                    </p>
                    <p className="text-xs text-ink/55 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {kindLabel}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        positive ? "text-success" : "text-danger"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {tx.points.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-ink/45">
                      Bal: {tx.balance_after.toLocaleString()}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
