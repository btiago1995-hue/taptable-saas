# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js)
npm run build     # Production build
npm run lint      # Run ESLint
```

There is no test runner configured.

## Architecture Overview

**Dineo** is a multi-tenant B2B SaaS for restaurant management (POS, digital menus, ordering, payments, fiscal reporting). Stack: Next.js App Router + TypeScript + Supabase + Tailwind CSS v4.

### Tenancy Model

Each `restaurant` is a tenant. Isolation is enforced via Supabase Row-Level Security (RLS). Two Supabase client instances exist in [src/lib/supabase.ts](src/lib/supabase.ts):
- `supabasePublic` — uses `ANON_KEY`, respects RLS. Use in components and most server actions.
- `supabaseAdmin` — uses `SERVICE_ROLE_KEY`, bypasses RLS. **Only use in API routes** (`/api/*`), never in frontend code.

### App Structure

| Route | Purpose |
|---|---|
| `/admin/*` | Authenticated restaurant staff UI (dashboard, POS, kitchen, settings) |
| `/p/[restaurante_id]/*` | Public customer-facing storefront (menu, ordering, checkout) |
| `/api/*` | Server-side API routes (webhooks, payment, fiscal, onboarding) |
| `/superadmin/*` | Internal platform administration |
| `/driver/*` | Delivery driver interface |

### State Management (Context API)

All global state lives in `/src/lib/`:
- **AuthContext** — auth session + user profile + restaurant data + trial/plan info
- **MenuContext** — menu categories/items (tenant-aware, sourced from URL or auth)
- **OrderContext** — live orders with real-time status
- **CartContext** — shopping cart (localStorage-persisted, public storefront only)

### Subscription Plan Gating

Feature access is controlled by `usePlanGate(feature)` from [src/lib/planGate.ts](src/lib/planGate.ts). Plans: `starter`, `growth`, `pro`. Gated features include KDS, delivery, analytics, SAF-T, etc. Redirect unauthorized users to `/admin/upgrade?feature=<name>`.

### Fiscal Integration (E-Fatura / DNRE)

[src/lib/efatura.ts](src/lib/efatura.ts) generates IUD codes (45-char document IDs for Cabo Verde tax compliance). IUD structure: `NIF(9) + DocType(2) + Year(4) + Sequence(8) + Hash(22)`. Sequences are tracked in the `efatura_sequences` table using an atomic PL/pgSQL function to prevent race conditions. The hash currently uses HMAC-SHA256 (dev); production requires RSA-SHA1.

### Payment Gateways

- **Vinti4Net** (primary) — local gateway for CV/PT. Fingerprint is SHA-512 of base64-encoded params. Webhook at `/api/vinti4/webhook`.
- **Stripe** — secondary, less prominent in codebase.

### Key Utilities

- `src/lib/utils.ts` — `formatCurrency`, `cn` (Tailwind class merging), shared helpers
- `src/lib/offline-queue.ts` — queues orders when offline; synced via `/api/orders/sync`
- `src/lib/notifications.ts` — push/email notification helpers

### Database Migrations

SQL migrations live at the project root:
- `supabase_efatura_migration.sql`
- `supabase_rls_migration.sql`
- `supabase_subscriptions_features_migration.sql`

Apply manually via Supabase dashboard or CLI. There is no automated migration runner.

### Localization

All UI is in **European Portuguese** (Portugal/Cabo Verde). Keep all user-facing strings in `pt-PT`.

### Path Alias

`@/*` maps to `./src/*`.
