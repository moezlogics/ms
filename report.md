# MobileStore.pk — Frontend Debug & Optimization Report

**Date:** July 6, 2026
**Analyzed page (live production):** `https://www.mobilestore.pk/tenco/mobile/tecno-camon-slim`
**Scope:** Source-code duplication, HTML bloat, rendering strategy (SSR/ISR/CSR), dependencies, server load, SEO/LCP.
**Status:** Debug/analysis only — koi code change implement **nahi** kiya gaya.

---

## 1. Executive Summary (TL;DR)

Aapki product page ka HTML **823 KB** hai (gzip ke baad bhi **~114 KB**). Iska **~75% hissa duplicate data hai** — wahi content jo user ko ek dafa nazar aata hai, wo source mein 3 se 14 dafa maujood hai. Teen bade culprits hain:

| # | Problem | Cost (per page) | Fix difficulty |
|---|---------|-----------------|----------------|
| 1 | `experimental.inlineCss` — 204 KB CSS inline **+ wahi 201 KB dobara** RSC payload mein | **~405 KB (48%)** | Easy (1 line) |
| 2 | Full product object client components ko **3 dafa** serialize ho raha hai | ~42 KB + | Medium |
| 3 | 11.7 KB ki rich description flight payload mein **4 identical copies** | ~47 KB | Medium |
| 4 | Mobile + Desktop layouts dono server par render (gallery, actions, tabs ×2) | ~30–40 KB DOM | Medium |
| 5 | CDN caching **broken** — har page view origin par full SSR (`Cf-Cache-Status: DYNAMIC`) | Server load + slow TTFB | Medium |
| 6 | 1.37 MB JavaScript (28 chunks), 112 KB polyfills modern browsers ke liye bhi | LCP/TBT | Medium |

**Sab se pehla, sab se bara fix:** `next.config.js` se `experimental.inlineCss: true` hatana. Ye akela change HTML ko 823 KB se **~420 KB** par le aayega — kyunke abhi pura Tailwind CSS har page ke andar **do dafa** ship ho raha hai aur browser usay kabhi cache nahi kar pata.

---

## 2. Measured Evidence (Live Production HTML)

Saari measurements live page fetch kar ke ki gayi hain (workspace mein `page.html` + `analyze-*.js` scripts se reproduce kar sakte hain: `node analyze-html.js` etc.).

### 2.1 HTML Composition — 823 KB total

| Component | Size | % of page |
|-----------|------|-----------|
| RSC flight payload (`self.__next_f.push` — 55 script chunks) | 417 KB | 49.5% |
| Inline `<style>` (Tailwind CSS, `inlineCss` feature) | 204 KB | 24% |
| Visible body HTML (scripts nikaal kar) | 210 KB | 25% |
| JSON-LD schemas (4 blocks — Organization, GroceryStore, Breadcrumb, Product) | 6.4 KB | 0.8% |

**Critical finding:** RSC flight ka sab se bara chunk (**201,429 bytes — chunk #3**) sirf **Tailwind CSS text hai** — wahi CSS jo upar `<style>` tag mein already inline hai. Ye Next.js 15 ke `experimental.inlineCss` ka known side-effect hai: CSS render bhi hota hai aur hydration ke liye flight stream mein dobara bhi jata hai. Matlab **~405 KB (page ka 48%) sirf CSS hai, wo bhi do copies mein**, aur har page navigation par dobara download hota hai (external CSS file hoti to browser ek dafa cache kar leta).

### 2.2 Description Duplication — user complaint confirmed

Aapne kaha tha "description 5 bar se zyada aa rahi hai" — **bilkul sahi hai, measured counts:**

| Text | Total occurrences | Kahan |
|------|-------------------|-------|
| Meta description (160 chars) | **9 dafa** | 3 legit meta tags (`description`, `og:description`, `twitter:description`) + 3 copies flight mein (Next metadata streaming) + **3 copies serialized product objects ke `meta_description` field mein** |
| Rich description phrase ("expected to launch on June 30, 2026...") | **14 dafa** | 1 rendered HTML + 3 meta tags + **10 copies flight payload mein** |
| Product title "Tecno Camon Slim" | **77 dafa** | title/meta/schema/flight/related-products sab jaga |

**Flight mein identical duplicate chunks (byte-by-byte same):**

- Chunks **25, 27, 50, 53** — chaaron **bilkul identical**, har aik 11,762 bytes (poori rich description HTML) = **35 KB pure waste**
- Chunks **51 aur 54** — dono mein full product object (13,971 bytes each) same client component `$L3a` (ProductActions) ke liye — ek mobile layout instance, ek desktop layout instance

### 2.3 Duplicate DOM render (mobile + desktop)

Har gallery image visible DOM mein **2 dafa** render hoti hai (`lg:hidden` mobile layout + `hidden lg:grid` desktop layout), aur upar se **mixed quality params** ke sath (`q=75`, `q=80`, `q=85`) — jo image optimizer par ek hi image ke 3 alag resize jobs banata hai. Fallback `src` bhi `w=1920` hai mobile ke liye bhi.

### 2.4 JavaScript payload

- **28 script files, total 1,367 KB (uncompressed)**
- Sab se bara chunk: `8840-*.js` = **312 KB**
- `polyfills-*.js` = **112 KB** — halanke `browserslist` mein Chrome 91+ / Safari 15+ set hai, ye legacy polyfills phir bhi ship ho rahe hain
- PDP page chunk khud 99 KB, main layout chunk 55 KB

### 2.5 Caching / server headers (live response)

```
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Cf-Cache-Status: DYNAMIC
Set-Cookie: _medusa_cache_id=... (anonymous GET request par bhi!)
```

`middleware.ts` mein aapne anonymous visitors ke liye `s-maxage=300` set karne ki koshish ki hai (lines 63–73), **lekin production evidence dikhata hai ke wo kaam nahi kar raha**: response par `private, no-store` hai aur `Set-Cookie` bhi lag raha hai — Cloudflare kabhi cache nahi karega. Wajah: page `force-dynamic` hai to Next render ke waqt apna `no-store` Cache-Control laga deta hai jo middleware ke header ko override kar deta hai, aur `_medusa_cache_id` cookie bhi set ho rahi hai (header dump mein visible). **Natija: har single page view — Google bot samet — origin VPS par full SSR karata hai.**

Duplicate headers bhi mil rahe hain (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` do-do dafa — nginx + Next dono set kar rahe hain), aur `Referrer-Policy` ki dono values conflicting hain (`strict-origin-when-cross-origin` vs `same-origin`).

---

## 3. Root Cause Analysis — duplication kyun ho rahi hai

### RC-1: `experimental.inlineCss` (next.config.js line 27) — **page ka 48%**

CSS inline hota hai `<head>` mein (204 KB) **aur** React server components architecture usi CSS ko flight payload mein bhi bhejta hai (201 KB chunk #3) taake client-side navigation par styles mil sakein. Double cost + zero browser caching. FCP improve karne ke liye lagaya gaya tha, lekin 823 KB HTML download/parse khud FCP/LCP ko tabah kar raha hai — ilaaj bimari se mehenga par gaya hai.

### RC-2: Full product objects as client-component props — **3 copies**

RSC model mein jo bhi prop `"use client"` component ko jata hai, wo HTML ke andar flight JSON mein serialize hota hai. Aapke PDP par:

1. **`ProductTabs`** (`"use client"`) — `product={product}` pura object leta hai (`frontend/src/modules/products/components/product-tabs/index.tsx`), sirf `metadata` keys chahiye hoti hain. Mobile + desktop dono layouts mein render hota hai (same object reference → 1 serialized copy).
2. **`ProductActionsWrapper`** (`frontend/src/modules/products/templates/product-actions-wrapper/index.tsx`) — **wahi product dobara backend se fetch karta hai** aur full object client `ProductActions` ko deta hai. Ye wrapper 2 dafa render hota hai (mobile + desktop Suspense), har instance apni fetch/parse karta hai → **2 alag object copies** (chunks 51 & 54, 13.97 KB each — measured identical payload).
3. Product ke `metadata` mein `rich_description` (11.7 KB HTML), `meta_title`, `meta_description`, `specs` sab bhara hua hai — to **har full-product copy ke sath ye sab bhi duplicate hota hai.**

### RC-3: Rich description alag se bhi 4 dafa (chunks 25/27/50/53)

`ProductDescriptionTabs` (`"use client"`) ko `richDescription`, `plainDescription` string props jati hain — plus wahi text har serialized product object ke `metadata.rich_description` mein bhi hai. Flight-level string dedup nahi hota kyunke ye alag-alag fetches ke alag object instances hain.

### RC-4: Mobile/Desktop double server-render

`frontend/src/modules/products/templates/index.tsx` (lines 478–571) mein poora PDP do dafa likha hai — `lg:hidden` block aur `hidden lg:grid` block. Gallery, ProductInfo, PreorderBanner, ProductActions, ProductTabs — sab duplicate DOM + duplicate client-component serialization. CSS se hide karna network par dono bhejta hai.

### RC-5: Metadata streaming (minor, by-design)

Next 15 meta tags ko `<head>` mein bhi render karta hai aur flight mein bhi stream karta hai — is liye description ke 3 tag × 2 = 6 copies to framework ki wajah se hain. Ye normal hai, lekin aapke case mein `generateMetadata` ka `other` block (pubdate/revised/date/last-modified — 4 non-standard duplicate timestamp tags) aur 4 og:images isko aur phula rahe hain.

---

## 4. Rendering Strategy Audit (SSR / ISR / CSR / Static)

### Current state — sab kuch force-dynamic hai

| Route | Current | Wajah |
|-------|---------|-------|
| PDP / Category / Brand (`[...slug]`) | **`force-dynamic`** (explicit, line 31) | Auth cookies + no-store combo |
| Home, Store, Collections | Dynamic (implicit) | `(main)/layout.tsx` har page par `retrieveCustomer()` + `retrieveCart()` call karta hai → cookies read → **poori site dynamic ho jati hai** |
| Blog | ISR (`revalidate: 60/300`) ✅ | Sahi configured hai |
| Static pages (terms, privacy, about...) | Dynamic (layout ki wajah se) | Bekar mein |

**Core architectural issue:** `frontend/src/app/[countryCode]/(main)/layout.tsx` (lines 26–30) mein `retrieveCustomer()`, `retrieveCart()` server-side har request par chalte hain. Cookies parhte hi Next static/ISR optimization chhor deta hai. Cart badge / login state jese **per-user** cheezon ki wajah se **per-product** content bhi dynamic ho gaya hai.

### Recommended target architecture

| Layer | Strategy | Detail |
|-------|----------|--------|
| PDP, Category, Brand, Home, Store | **ISR** — `revalidate: 300` (5 min) + on-demand `revalidateTag` (backend subscriber already maujood hai: `revalidate-storefront.ts`) | Anonymous shared shell. Prices/stock 5 min stale acceptable (aap khud `staleTimes: 60` se ye maan chuke hain) |
| Cart badge, customer greeting, wishlist state | **CSR** — client component jo mount ke baad ek lightweight `/api` call kare | Layout se `retrieveCustomer/retrieveCart` hatana ISR unlock karne ki **shart** hai |
| Cart, Checkout, Account, Orders | **SSR (dynamic)** — jaise hai theek | Per-user, uncacheable |
| Blog, Terms/Privacy/About | **Static/ISR** | Layout fix hote hi ye khud static ho jayenge |
| Live price/stock precision (optional) | Client-side revalidation on mount | Agar 5-min staleness bhi manzoor na ho |

### 4.1 ISR par 500 error — runtime-proven root cause (LIVE DEBUGGED)

**Experiment (Jul 6):** PDP ka `force-dynamic` hata kar `revalidate = 300` lagaya, local production build + start kiya, instrumented logging ke sath page hit kiya.

**Result:** `HTTP 500`, digest `DYNAMIC_SERVER_USAGE`. Phir sirf `force-dynamic` wapas laga kar (same build, same code) → `HTTP 200`. Controlled A/B — trigger confirmed.

**500 kyun aata hai aur wajah kyun nahi milti — proven chain:**

ISR/static render ke doran `cookies()` ya `searchParams` access karna Next ke liye violation hai. Aapke `cookies.ts` helpers is error ko **try/catch mein swallow kar lete hain** — render aage chalta rehta hai (logs mein "layout data resolved" tak aaya) — **lekin Next andar se route ko already "dynamic usage" mark kar chuka hota hai**, aur render mukammal hone par framework khud `DYNAMIC_SERVER_USAGE` 500 phenk deta hai. Error message production mein omit hota hai, is liye "wja pta nhi lgti". Comments mein likha "foodiespakistan swallow pattern" is route par is liye kaam nahi karta kyunke wahan render path mein cookies() call hoti hi nahi.

**Teen (3) confirmed offenders — logged with stack traces (`debug-90b8a9.log`):**

| # | Offender | Evidence | Zaroori fix |
|---|----------|----------|-------------|
| 1 | `(main)/layout.tsx` → `retrieveCustomer()` + `retrieveCart()` → `getAuthHeaders`/`getCartId`/`getCacheTag("customers")` → `cookies()` | Log: *"Route /[countryCode]/[...slug] couldn't be rendered statically because it used `cookies`"* from all three helpers, stack layout ke `Promise.all` se | Layout se dono calls hatao; cart badge/login state client component mein mount ke baad fetch ho |
| 2 | `lib/config.ts` SDK fetch wrapper → `getLocaleHeader()` → `getLocale()` → `cookies()` — **har ek backend call par** | Log: same error `locale-actions.ts:getLocale` se, har `sdk.client.fetch` par fire hua; build-time `generateStaticParams` mein bhi ("called outside a request scope") | Wrapper se render-path cookie read hatao. Static/shared pages ka locale cookie-dependent ho hi nahi sakta (cached HTML sab ko same milta hai). Locale sirf user-specific flows (cart/account actions) mein explicitly pass karo |
| 3 | `[...slug]/page.tsx` + `generateMetadata` → `await props.searchParams` | Log: "about to await searchParams" fire hua, uske baad wala log **kabhi nahi aaya** — await ne render abort kar diya | Server par searchParams bilkul na parho. `v_id` gallery-selection client-side `useSearchParams` se; category filters/sort/page bhi client-side hydrate hon (neeche pattern) |

**Nota bene:** In teeno mein se **koi ek bhi** reh jaye to poora route 500 karega. Pichhli dafa aapne sirf `revalidate` lagaya tha, teeno offenders maujood the — is liye har render fail hua.

**Best-practice target pattern (static shell + client personalization):**

1. **Phase 1 — SDK wrapper safe karo:** `config.ts` ke fetch override se `getLocaleHeader()` hatao (ya sirf tab call karo jab caller explicitly locale de). Ye sab se pehle karo — iske baghair kuch bhi ISR nahi ho sakta.
2. **Phase 2 — Layout anonymous banao:** `(main)/layout.tsx` se `retrieveCustomer`/`retrieveCart` hatao. `Nav` ka cart badge + account icon ek chhota `"use client"` component ho jo mount ke baad server action / route handler se cart count le (ye request user cookies ke sath jati hai, dynamic hai, lekin **page render se bahar** hai). `ClientCartMismatchBanner`, `ClientFreeShippingNudge`, `ClientCartDrawer` isi client fetch se data lein.
3. **Phase 3 — PDP se searchParams nikalo:** `v_id` → `ImageGallery` (already client) khud `useSearchParams()` se parhe. `generateMetadata` ka `hasFilterParams` logic hatao — filtered URLs ka `noindex` middleware mein `X-Robots-Tag` header se karo (middleware har request par chalta hai, ISR cache ko affect nahi karta, aur query string wahan available hai).
4. **Phase 4 — ISR on karo:** `export const revalidate = 300` (force-dynamic hatao). Category/brand filters: base page ISR shell render kare (default listing), filter/sort/pagination client-side ho — `/api/products-search` proxy pattern already maujood hai, wahi use karo.
5. **Phase 5 — verify then rollout:** Local build + `curl` se 200 confirm karo (verification section 11), phir `Cf-Cache-Status: HIT` check karo. Har phase ke baad deploy se pehle local A/B test.

**Important:** Ye order lazmi hai. Phase 4 ko pehle karna = wahi 500. Aur `cookies.ts` ke swallow-catches ISR ke liye "fix" NAHI hain — wo sirf error chhupate hain; asal fix ye hai ke static render path mein `cookies()` **call hi na ho**.

**CDN layer:** ISR aane ke baad middleware ka `s-maxage=300` header kaam karne lagega (Next `no-store` nahi lagayega), aur anonymous traffic Cloudflare edge se serve hoga — **origin VPS load ~90% girega** typical read-heavy store traffic par.

---

## 5. PDP Server Load — backend call census

Ek single uncached PDP render par backend ko **~20+ HTTP calls** jate hain:

- `generateMetadata`: listProducts, region, siteSettings, brandForProduct (4)
- Page body: listProducts (dobara), brandByPath, categoryByHandle, region, brandForProduct (dobara), listBrands (6)
- `ProductTemplate`: reviewStats, reviewsJsonLd, bundles, altMap (CDN), specTemplate, siteSettings, **listProducts limit=24** (related), + backup listProducts agar <5, + brandByHandle + brand products listProducts (7–10)
- `ProductActionsWrapper` ×2: listProducts by id ×2, siteSettings ×2 (4) — **pure duplicate of page fetch**
- FBT: region, siteSettings, listProducts (0–3)
- Layout: customer, cart, siteSettings, (+ nav/footer fetches)

`getSiteSettings` React `cache()` use karta hai (deduped ✅) aur fetches `force-cache` + tags use karte hain ✅ — lekin `ProductActionsWrapper` ki re-fetch aur metadata-vs-body ki duplicate lookups avoidable hain. ISR ke baad ye poora census sirf revalidation par chalega, har visitor par nahi.

---

## 6. Dependency Audit

| Package | Verdict | Detail |
|---------|---------|--------|
| `qs` | **REMOVE — unused** | `frontend/src` mein koi import nahi mila |
| `lodash` + `@types/lodash` | **REMOVE — replaceable** | Sirf 3 functions use ho rahe hain: `isEqual` (2 jaga), `mapKeys`, `pick` — teeno ke chhote native/hand-rolled replacements 20 lines mein ban jate hain |
| `lenis` (smooth scroll) | **QUESTIONABLE — remove recommended** | Root layout par site-wide load hota hai (`ClientSmoothScroll`). E-commerce mobile store par scroll-jacking UX ke liye bhi controversial hai aur main-thread scroll listeners LCP/INP kharab karte hain |
| `react-leaflet` + `leaflet` + `@types/leaflet` | **KEEP (already lazy)** | Sirf checkout map-picker, `dynamic(ssr:false)` se properly lazy-loaded ✅. `@types/leaflet` ko `devDependencies` mein move karein (abhi `dependencies` mein hai) |
| `pdf-parse` | **KEEP (server-only)** | Sirf 2 API routes mein lazy `require()` — client bundle mein nahi jata ✅ |
| `yet-another-react-lightbox` | KEEP | Properly lazy-loaded on first open ✅ |
| `react-country-flag` | KEEP (minor) | 2 components; `optimizePackageImports` mein already hai |
| `@babel/core`, `babel-loader`, `babel-plugin-react-compiler` | **REVIEW devDeps** | Next 15 SWC use karta hai; agar React Compiler actually enabled nahi hai (`next.config.js` mein `reactCompiler` flag nahi mila) to teeno fuzool hain |
| `@types/pg` | **REMOVE** | `pg` dependency hi nahi hai frontend mein |
| `ansi-colors` | REVIEW | Sirf scripts ke liye lagta hai |
| Root folder: `my-medusa-store-storefront.zip` (1.76 MB), `test-sdk.js`, `test-sitemap.js`, `scratch/`, `tsconfig.tsbuildinfo` (476 KB) | **CLEAN UP** | Repo bloat, deploy artifacts mein nahi jane chahiye |

**Bundle-level:** `polyfills` chunk (112 KB) modern-only browserslist ke bawajood ship ho raha hai — Next ise by-default har page par deta hai magar modern targets ke sath [`browserslist` ko `.browserslistrc`/package.json mein sahi jaga hona aur build verify karna chahiye ke legacy transforms band hain. 312 KB ka `8840` vendor chunk analyze karna hoga (`npm run analyze` script already maujood hai) — ye sab se bara single JS file hai.

---

## 7. SEO Findings

**Theek cheezein (koi change nahi chahiye):** 1 title, 1 canonical, 1 H1, robots `index,follow`, Product JSON-LD real reviews ke sath, BreadcrumbList, no fabricated ratings ✅

**Issues:**

1. **Page weight = crawl/render budget problem.** 823 KB HTML (114 KB gzip) Google ke renderer ke liye bhari hai; "kohit" (crawled - currently not indexed / low quality signal) ka sab se qawi technical factor yehi hai — duplicate source content khud direct penalty nahi hota, lekin bloated HTML + slow LCP + har request DYNAMIC (no cache) = poor page experience signals.
2. **og:type mismatch:** `openGraph.type: "website"` set hai jabke `other` block mein `og:type: product` inject hota hai — do og:type ban jate hain conflicting values ke sath. Sirf `product` hona chahiye.
3. **Non-standard meta timestamps:** `pubdate`, `publish-date`, `date`, `revised`, `last-modified` — koi search engine inhe nahi parhta; `article:published_time` + JSON-LD `datePublished` kafi hain. ~600 bytes/page + noise.
4. **GroceryStore schema** mobile phone store par (`business_type` default "grocery" hai — `SiteJsonLd`). Google ko galat business category signal ja raha hai. Admin setting se "general"/electronics-appropriate type set hona chahiye.
5. **No hreflang** (en_PK/ur_PK og:locale hai lekin hreflang tags nahi) — minor, single-locale site ke liye theek hai.
6. **URL typo:** category path `/tenco/...` hai (`tecno` nahi) — canonical bhi yehi hai to consistent hai, lekin brand-name misspelling SERP display aur type-in traffic ke liye suboptimal. (Rename karna ho to 301 redirects lazmi.)

---

## 8. LCP / Performance Findings

1. **LCP image preload nahi hota** — sirf site **logo** preload hai (`mobilestore-V6IMdNlJ.webp`) + font. Gallery `"use client"` hai, desktop par explicitly `priority={false}` (`templates/index.tsx` line 534). Pehli product image ko `priority` + `fetchpriority=high` milna chahiye, logo preload ki jagah.
2. **823 KB HTML** khud LCP blocker hai — browser ko itna parse karna parta hai pehli paint se pehle (Slow 4G par ~2s sirf download).
3. **Mixed image qualities** (q=75/80/85) same image ke liye — CDN cache fragmentation + extra sharp jobs on VPS. Ek quality standardize karein.
4. **Icon fonts ~420 KB** (3 Phosphor weights) — idle-load defer already hai ✅, lekin 3 poori weight files ke bajaye used-icons ka subset ya SVG sprites better hain.
5. **1.37 MB JS + hydration of duplicated flight** — TBT direct isi se hai.
6. `Cf-Cache-Status: DYNAMIC` — TTFB har visitor ke liye origin-bound (Pakistan→origin→Medusa roundtrips).

---

## 9. Security/Correctness Side-Findings

1. **`"use server"` on 16 data files** (`products.ts`, `cart.ts`, `customer.ts`, ...) — is directive se **har exported function ek public POST endpoint** ban jata hai jo koi bhi call kar sakta hai. Data-fetch files ko `import "server-only"` hona chahiye (jaise `site-settings.ts` mein sahi hai), `"use server"` sirf genuine mutations/actions ke liye.
2. `_nextJsCompilerWorkaround` export ([...slug]/page.tsx lines 53–56) — tree-shaking bug ka workaround; Next upgrade par re-test kar ke hatana chahiye.
3. Duplicate/conflicting security headers nginx + Next dono se (Referrer-Policy conflict measured) — ek jaga (nginx) par consolidate karein.

---

## 10. Prioritized Fix Plan (implementation ke liye ready)

### P0 — Ek din ka kaam, sab se bara impact
| Fix | Expected result |
|-----|-----------------|
| `experimental.inlineCss: true` remove karein (external CSS + immutable cache + Cloudflare) | HTML 823 KB → **~420 KB**; CSS browser-cached across pages |
| `ProductActionsWrapper` ki duplicate fetch hatao — page ka fetched product prop se pass karein | −28 KB flight, −2 backend calls/view |
| Client components ko full `product` ke bajaye sirf zaroori fields do (`ProductTabs` → specs/metadata subset; `ProductActions` → variants/options/prices subset; `FBTClient` → id/title/thumbnail) | −40–60 KB flight |
| `qs`, `lodash`, `@types/pg` remove; lodash usages native se replace | Bundle −~70 KB |

### P1 — ISR migration (asal architectural fix — **section 4.1 ka phase order lazmi follow karein, warna 500**)
| Fix | Expected result |
|-----|-----------------|
| **Phase 1:** `config.ts` SDK wrapper se `getLocaleHeader()`/cookies hatao (proven 500-offender #2) | Har backend fetch static-safe |
| **Phase 2:** `(main)/layout.tsx` se `retrieveCustomer()`/`retrieveCart()` hatao → client-side cart/user widget (proven 500-offender #1) | Poori catalog ISR-eligible |
| **Phase 3:** PDP/metadata se `searchParams` read hatao — `v_id` client-side, filtered-URL noindex middleware `X-Robots-Tag` se (proven 500-offender #3) | Route static render ke qabil |
| **Phase 4:** PDP se `export const dynamic = "force-dynamic"` hatao → `export const revalidate = 300` | Cached renders, TTFB ~50ms edge |
| Middleware cache headers verify karo (ISR ke baad `s-maxage` actually apply hoga; anonymous path par `Set-Cookie` bilkul na ho) | `Cf-Cache-Status: HIT`, origin load −80-90% |
| Backend `revalidate-storefront.ts` subscriber ke tags se on-demand purge (already built ✅) | Fresh prices within seconds of admin change |

### P2 — Rendering cleanup
| Fix | Expected result |
|-----|-----------------|
| Mobile/desktop double layout ko single responsive render mein merge karo (CSS grid re-order; jo cheez sach mein alag hai sirf wohi branch ho) | −30-40 KB DOM + half hydration |
| LCP: pehli gallery image `priority` + preload; logo preload hatao; ek quality (q=75) standardize | LCP −1–2s |
| og:type fix, non-standard meta timestamps hatao, GroceryStore → sahi business type | Cleaner SERP signals |
| `"use server"` → `import "server-only"` on data files (actions alag file mein) | Attack surface band |

### P3 — Polish
- Phosphor icon subset / SVG sprite (−~350 KB idle-load)
- Lenis remove ya sirf desktop home par
- 312 KB vendor chunk analysis (`ANALYZE=true next build`)
- Repo cleanup (zip, scratch, test scripts)
- nginx/Next duplicate headers consolidate

### Expected combined outcome
- HTML: **823 KB → ~250–300 KB** (gzip ~35–45 KB)
- Description occurrences: 14 → **4–5** (3 meta tags + 1 rendered + 1 schema — ye legitimate hain)
- TTFB (anonymous): origin SSR har view → **edge cache HIT**
- Origin VPS load: har view full render + 20 backend calls → sirf revalidations
- LCP: preloaded, priority image + halka HTML → 2.5s se neeche realistic target

---

## 11. Verification / Re-measurement

Fixes ke baad yehi measurements dobara chalayen (workspace root mein scripts maujood hain):

```powershell
curl.exe -s -o page.html "https://www.mobilestore.pk/tenco/mobile/tecno-camon-slim" -H "User-Agent: Mozilla/5.0"
node analyze-html.js    # size breakdown + desc occurrences
node analyze-chunks.js  # identical duplicate flight chunks
node analyze-seo.js     # canonical/robots/gzip
node analyze-js.js      # total JS payload
curl.exe -s -I https://www.mobilestore.pk/  # Cf-Cache-Status check
```

Success criteria: HTML < 300 KB, desc occurrences ≤ 5, zero identical flight chunks > 3 KB, `Cf-Cache-Status: HIT` on anonymous second request.
