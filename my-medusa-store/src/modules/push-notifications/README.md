# Web Push Notifications

Native browser push notifications for the storefront — no Firebase, no
external service. Uses VAPID keys via the `web-push` library.

## What's included

- **Module** — `push_notifications` registered in `medusa-config.ts`
  - `push_subscription` table — one row per browser/device with VAPID keys + geo
  - `push_campaign` table — manual campaign history with stats
- **Storefront API**
  - `GET  /store/push-subscriptions/vapid-public-key`
  - `POST /store/push-subscriptions` — register/upsert a subscription
  - `DELETE /store/push-subscriptions` — unsubscribe
- **Admin API**
  - `GET  /admin/push-subscriptions` — list with filters + dashboard stats
  - `DELETE /admin/push-subscriptions/:id` — manual prune
  - `GET  /admin/push-campaigns` — campaign history
  - `POST /admin/push-campaigns` — compose + send (supports city/state filters and dry-run)
  - `POST /admin/push-campaigns/test` — send a test push to the latest device
- **Admin UI** — `/app/push-notifications` and `/app/push-notifications/campaigns`
- **Subscriber** — `order-push-notification.ts` handles `order.placed`,
  `order.completed`, `order.fulfillment_created` and pushes to all of
  the customer's active subscriptions
- **Storefront** — `/sw.js` service worker, `<PushPrompt />` initializer,
  `<PushToggle />` UI control, geo lookup via ipapi.co

## Setup (one-time)

### 1. Generate VAPID keys

From the backend project root:

```bash
npx web-push generate-vapid-keys
```

You'll get a public + private keypair. Save them.

### 2. Backend env (`my-medusa-store/.env`)

```
VAPID_PUBLIC_KEY=BHr...your-public-key
VAPID_PRIVATE_KEY=Z...your-private-key
VAPID_SUBJECT=mailto:admin@yoursite.com
```

### 3. Storefront env (`my-medusa-store-storefront/.env.local`)

The storefront uses the *same* public key — fetched from the backend at
runtime, no need to duplicate it as an env var. The service worker
(`/sw.js`) is served from the public folder automatically.

### 4. Run the DB sync

From repo root:

```bash
node sync-db-complete.js
```

Creates `push_subscription` + `push_campaign` tables (idempotent — safe
to run on existing databases).

### 5. Restart the backend

```bash
cd my-medusa-store
npm run dev
```

Open `/app/push-notifications` in the admin to see the dashboard.

## Notes

- **Permission flow** — The storefront uses the *native* browser prompt
  (`Notification.requestPermission()`) — no custom HTML popup. Modern
  browsers require a user gesture before showing the prompt, so
  `<PushPrompt />` defers it until the first `click` / `scroll` /
  `keydown` after page load.
- **Geo resolution** — Free, key-less ipapi.co lookup. Replace with a
  paid provider in `push-client.ts → resolveGeo()` if you need higher
  accuracy or volume.
- **iOS Safari** — Web Push works on iOS 16.4+ but only when the site
  is installed as a PWA (added to home screen). Desktop Safari works
  out-of-the-box.
- **Expired subscriptions** — Push services return 404/410 for dead
  endpoints. The campaign sender automatically soft-deletes those rows
  after each batch, so the subscriber list stays clean.
- **Concurrency** — `sendPushBatch()` defaults to 20 concurrent sends.
  Tune in `web-push-client.ts` if your push service rate-limits you.
