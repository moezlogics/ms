-- ===================================================================
--  Performance indexes for the mobile store (Medusa 2.13.6 / Postgres)
-- ===================================================================
--
--  WHY: the admin dashboard and several listings filter/order by
--  created_at and status. Without indexes on those columns Postgres
--  does sequential scans that get slower as the tables grow — the main
--  DB-side cause of rising latency and load under traffic.
--
--  These statements are SAFE to run on a live database:
--    * CREATE INDEX CONCURRENTLY  -> does NOT lock the table for writes
--    * IF NOT EXISTS              -> re-running is a no-op
--
--  CONCURRENTLY cannot run inside a transaction block or a DO/PL-pgSQL
--  block, so each index is a plain top-level statement. ON_ERROR_STOP
--  is OFF so that if a table name differs in your schema, that single
--  statement is skipped (with a visible error) and the rest still run.
--
--  HOW TO RUN (on the server, as the DB user — NOT inside psql -1):
--    psql "$DATABASE_URL" -f performance-indexes.sql
--
--  Verify afterwards:   psql "$DATABASE_URL" -c "\di+ idx_*"
--  Inspect table names: psql "$DATABASE_URL" -c "\dt"
-- ===================================================================

\set ON_ERROR_STOP off

-- ---- orders: dashboard trend, recent orders, status filters --------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_created_at
  ON public."order" (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status
  ON public."order" (status);

-- Composite: fast "recent non-canceled orders" scans used by analytics.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_status_created_at
  ON public."order" (status, created_at DESC);

-- ---- customers: "new customers in period" + growth -----------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_created_at
  ON public.customer (created_at DESC);

-- ---- order line items: top-products aggregation --------------------
-- (If your line-item table is named differently, adjust and re-run.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_line_item_order_id
  ON public.order_line_item (order_id);

-- ---- blog posts: published listings ordered by date ----------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_post_status_published_at
  ON public.blog_post (status, published_at DESC);
