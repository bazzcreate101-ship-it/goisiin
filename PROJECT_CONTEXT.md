# Goisiin Project Context

Audit snapshot: 2026-08-02 Asia/Jakarta

Repository: https://github.com/bazzcreate101-ship-it/goisiin.git
Local path: C:\Users\bagas\Downloads\tesbarunian
Audited commit: 673d7f2 - feat: replace old logo & banners with new ones, configure favicon tab icon
Production domain checked: https://goisiin.com
Reference UI target: https://garudavoucher.id

## Product Intent

Goisiin is a React/Vite storefront for game top-up, voucher, entertainment, and e-wallet products. The visual direction is intentionally a GarudaVoucher-style clone: dark surface, green/army accent, sticky category bar, banner carousel, flash sale strip, product cards, order page, invoice page, login modal, footer payment badges, and chat widget.

Important: several code paths still point directly to GarudaVoucher pages, especially legal/blog links. Treat this as intentional mimicry only if the owner approves; otherwise these links should be replaced with Goisiin-owned pages before real production use.

## Stack

- Frontend: React 19 + Vite 8
- Styling: custom CSS in `src/index.css`, Bootstrap CSS/JS CDN, Bootstrap Icons CDN, Boxicons CDN, Google Fonts CDN
- Auth: Supabase OAuth via `@supabase/supabase-js`
- AI chat: Premzone chat completions endpoint from browser code
- Hosting: Vercel static SPA with catch-all rewrite in `vercel.json`
- Data persistence currently used by the app: mostly `localStorage` and `sessionStorage`

## Main File Map

- `src/main.jsx`: React root render.
- `src/App.jsx`: top-level view switching, Supabase auth listener, admin route check, shared product state.
- `src/data/products.js`: canonical static catalog and payment channel definitions.
- `src/assets/images.js`: Vite-bundled image imports for logo, banners, products, payments, and icons.
- `src/components/Header.jsx`: navbar, search trigger, login/profile dropdown, top navigation.
- `src/components/SearchPanel.jsx`: global product search.
- `src/components/LoginModal.jsx`: Google OAuth login UI.
- `src/components/Banner.jsx`: banner slider.
- `src/components/Categories.jsx`: sticky category filter.
- `src/components/FlashSale.jsx`: scrolling promo cards.
- `src/components/ChatWidget.jsx`: AI/live-support style chat widget.
- `src/components/Footer.jsx`: sitemap, support, payment logos.
- `src/views/HomeView.jsx`: home page, product grid, news, FAQ, SEO copy.
- `src/views/OrderView.jsx`: product order form, denomination selection, payment selection, invoice creation.
- `src/views/InvoiceView.jsx`: invoice UI and simulated payment status.
- `src/views/TransactionsView.jsx`: user transaction history from browser storage.
- `src/views/AdminLogin.jsx`: client-side admin login.
- `src/views/AdminDashboard.jsx`: browser-storage based admin CRUD, transactions, users, chat hub.

## Routes / Navigation

This app does not use React Router. It uses component state plus URL hash/path checks.

- `/` or empty hash: home
- `#/order/{productId}`: order view
- `#/invoice/{invoiceId}`: invoice view, but requires in-memory `invoiceData`
- `#/transactions`: transaction history
- `/bolehnihadmin` or `#/bolehnihadmin`: admin login/dashboard

Vercel rewrites all paths to `index.html`, so `/bolehnihadmin` works as a static SPA route.

## Environment Variables

Observed from code and Vercel screenshot:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PREMZONE_API_KEY`

Risk note: every `VITE_*` value is exposed to the browser bundle. Supabase anon keys are normally public when protected by Row Level Security, but a Premzone bearer key should not be treated as secret if it is passed as `VITE_PREMZONE_API_KEY`.

## Current Deploy State

`https://goisiin.com` returned HTTP 200 from Vercel. Response headers showed:

- `Server: Vercel`
- `X-Vercel-Cache: HIT`
- `Last-Modified: Sun, 02 Aug 2026 07:23:22 GMT`
- Static HTML title matches local `index.html`

`https://goisiin.com/bolehnihadmin` also returned the SPA HTML via the Vercel rewrite.

## Verification Run

Commands run locally:

- `npm run build`: passed.
- `npm run lint`: passed.
- Mock API test for `/api/admin-login` + `/api/admin-verify`: passed.

Build warning:

- Main JS chunk is larger than 500 kB after minification.

Post-hardening build warning:

- Main JS chunk is still larger than 500 kB.
- New banner/logo assets are larger than the previous assets because the supplied replacement images are high resolution.

## Hardening Changes Applied

- Replaced all active logo, favicon, bundled banner, and public banner fallback files with assets from `C:\Users\bagas\Downloads\aset.zip`.
- Added Vercel API endpoints:
  - `api/admin-login.js`
  - `api/admin-verify.js`
  - `api/chat.js`
- Added shared server helper `api/_security.js` for JSON responses, rate limits, HMAC token signing, token verification, and text cleanup.
- Removed hardcoded admin password from frontend.
- Admin sessions now use a signed server-issued token stored as `goisiin_admin_token`.
- Added admin login rate limiting by IP.
- Moved Premzone chat calls behind `/api/chat`.
- Removed Premzone API key usage from browser code.
- Added chat rate limits by IP, message length limits, context limits, and prompt-injection refusal rules.
- Chatbot now receives structured context for products, payment channels, promos, site mechanics, logged-in user, and that user's transaction list.
- Direct `#/transactions` access now opens login if the user is not authenticated.
- `#/order/{productId}` and `#/invoice/{invoiceId}` can restore state from the URL/storage.
- Invoice status check no longer randomly marks a user as paid/success.
- Home, search, and order pages now consume dynamic product state instead of importing only static catalog data.
- Storage JSON parsing now uses safe fallback parsing to avoid crashes from corrupt local data.

## Required Vercel Environment Variables

Keep existing:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Add or rename for server-side security:

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `PREMZONE_API_KEY`

`VITE_PREMZONE_API_KEY` should be removed after `PREMZONE_API_KEY` is added. The chat API currently accepts it only as a transition fallback, but the key is no longer referenced from browser code.

## High-Risk Findings

1. Admin auth is now improved but still not a substitute for a real database-backed admin model.
   - The hardcoded frontend password was removed.
   - Admin login is server-side and returns a signed expiring token.
   - For production-grade access control, admin operations should be backed by Supabase roles/RLS or server-side APIs.

2. Premzone API key exposure has been addressed in app code.
   - The browser no longer calls Premzone directly.
   - `/api/chat` calls Premzone server-side and applies rate/prompt/context controls.
   - Rotate the previously exposed key and configure `PREMZONE_API_KEY`.

3. Transactions, users, products, and chat state are still browser-local unless Supabase tables are added.
   - Orders are created in `localStorage`.
   - Invoice status is no longer randomly changed by the user check button.
   - Admin dashboard reads and edits the same browser-local records.
   - This is acceptable for a prototype, but real payments, fulfillment, admin operations, and support history need Supabase tables with RLS or protected server APIs.

## Functional Bugs / Mismatches

1. Admin product CRUD now affects the main storefront state.
   - `HomeView.jsx`, `SearchPanel.jsx`, and `OrderView.jsx` consume the `products` prop from `App.jsx`.

2. Invoice breadcrumb back to product is fixed for new invoices.
   - `OrderView.jsx` now saves `productId` in `invoiceData`.
   - `InvoiceView.jsx` navigates back with that `productId`.

3. `InvoiceView` now tries to restore invoice data from local storage by invoice ID.

4. Legal/blog links still point to GarudaVoucher.
   - Login terms/privacy, footer legal links, and home news links point to `garudavoucher.id`.
   - Replace with Goisiin pages before production use unless intentionally retained.

5. Minor React/quality issues remain.
   - `Header.jsx` uses `class=` once instead of `className=`.
   - Several alert-based placeholder actions remain.
   - `src/App.css` still contains unused Vite template styles.

## Recommended Fix Order

1. Add Supabase tables/RLS for products, orders, transactions, users, chat sessions, and admin roles.
2. Rotate the previously exposed Premzone key and set `PREMZONE_API_KEY`.
3. Add `ADMIN_PASSWORD` and a strong random `ADMIN_SESSION_SECRET` in Vercel.
4. Replace GarudaVoucher outbound links with Goisiin-owned legal/blog pages.
5. Consider image optimization for the supplied high-resolution logo/banner files.

## UI Context Notes

The Goisiin UI is built to mirror GarudaVoucher's public storefront pattern:

- dark background with green accent
- centered max-width content
- sticky glass navbar
- top search panel
- horizontal sticky categories
- large banner carousel
- flash sale strip
- compact product cards
- order form with denomination/payment sections
- invoice/status page
- footer with payment badges and CS WhatsApp

When changing UI, preserve this structure unless the product direction changes.
