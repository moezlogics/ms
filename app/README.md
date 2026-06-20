# Orders Admin — PWA

Chhoti admin app: orders dekho, status change karo (Fulfill / Complete / Cancel),
aur **naya order aate hi phone par push notification**. Aapke mojooda web-push
(VAPID) system par chalti hai — koi Firebase nahi.

## Kaise chalta hai
- Ye ek **PWA** hai. Android par Chrome mein kholo → menu → **"Add to Home screen / Install app"**.
  Installed PWA background mein push receive karti hai (Service Worker se).
- Login admin email/password se hota hai (Medusa admin). Login ke baad app
  notification permission maangti hai aur device ko backend se register karti hai.

## Backend requirements (mobile store/my-medusa-store)
1. Ye SQL ek baar chalao (table banane ke liye):
   `psql "$DATABASE_URL" -f admin-push-table.sql`
2. Backend deploy karo (server + **worker** dono chalein — `pm2 status`).
3. Is app ka origin (e.g. `https://app.mobilestore.pk`) backend `.env` ke
   **ADMIN_CORS** aur **AUTH_CORS** mein add karo (warna login/orders CORS se block).
4. VAPID keys backend `.env` mein already honi chahiye (customer push ke liye pehle se hain).

## Build & deploy
```bash
cd "mobile store/admin-app"
cp .env.example .env      # VITE_BACKEND_URL set karo (is site ka API domain)
npm install
npm run build             # → dist/
```
`dist/` ko ek HTTPS subdomain par serve karo (e.g. app.mobilestore.pk).

### nginx (SPA fallback ZAROORI)
App BrowserRouter use karti hai, aur push notification `/orders/<id>` kholti hai.
Server ko har unknown path par `index.html` dena hoga:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
Service worker (`/sw.js`) aur `/manifest.webmanifest` `dist/` se hi serve honge.

## Test
1. App kholo → login → "🔔 Enable alerts" → permission allow.
2. "Test push" dabao → phone par notification aani chahiye.
3. Ek test order place karo → "🛒 New order #.." notification aaye + tap karne par
   us order ki detail khule.

## Doosri sites ke liye
Sirf `.env` ka `VITE_BACKEND_URL` + `VITE_STORE_LABEL` badal kar dobara build karo,
aur us site ke backend par wahi SQL + CORS + deploy. Backend code (model/routes/
subscriber) sab sites mein same hai.
