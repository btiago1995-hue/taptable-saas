# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design System

Ler obrigatoriamente [DESIGN.md](DESIGN.md) antes de qualquer decisão visual ou de UI.
Todas as cores, tipografia, espaçamento e direcção estética estão definidos aí.
Não desviar sem aprovação explícita do utilizador.
Em modo QA, assinalar qualquer código que não corresponda ao DESIGN.md.

## Memória Persistente

**No início de cada sessão**, ler obrigatoriamente:
- [memory/user.md](memory/user.md) — perfil e contexto do utilizador
- [memory/preferences.md](memory/preferences.md) — preferências de trabalho e comunicação
- [memory/decisions.md](memory/decisions.md) — decisões técnicas e de produto já tomadas
- [memory/people.md](memory/people.md) — pessoas e entidades relevantes

**Durante e no final de cada sessão**, actualizar os ficheiros relevantes quando:
- Uma nova decisão técnica ou de produto for tomada → `decisions.md`
- Uma nova entidade/contacto for identificada → `people.md`
- O utilizador expressar uma preferência nova → `preferences.md`
- O contexto do utilizador mudar → `user.md`

Estes ficheiros são a fonte de verdade do projecto entre sessões. Mantê-los actualizados é prioritário.

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

[src/lib/efatura.ts](src/lib/efatura.ts) generates IUD codes (45-char document IDs for Cabo Verde tax compliance). IUD structure: `NIF(9) + DocType(2) + Year(4) + Sequence(8) + Hash(22)`. Sequences are tracked in the `efatura_sequences` table via an atomic PL/pgSQL RPC (`efatura_next_sequence`).

**Hash algorithm is controlled by `EFATURA_ENV`:**
- `dev` (default) — HMAC-SHA256, no certificate needed
- `sandbox` / `production` — RSA-SHA1 via [src/lib/efatura-rsa.ts](src/lib/efatura-rsa.ts), requires `EFATURA_PRIVATE_KEY` env var (PEM from DNRE). **Do not change the signing logic** — it switches automatically via env.

**NIF validation** for CV and PT is in [src/lib/nif.ts](src/lib/nif.ts) (`validarNIF`, `validarNIFCV`, `validarNIFPT`).

### Payment Gateways

**Vinti4Net** (primary) — local gateway for CV/PT (SISP). Fingerprint is SHA-512 of base64-encoded params ([src/lib/vinti4.ts](src/lib/vinti4.ts)).
- Checkout: `/api/vinti4/checkout` — generates form params, stores `merchant_ref` in the order
- Webhook: `/api/vinti4/webhook` — verifies fingerprint, looks up order by `merchant_ref` (direct DB query), has replay-attack protection (10-min timestamp window) and idempotency guard

**Stripe** — secondary, less prominent in codebase.

### Key Utilities

- [src/lib/utils.ts](src/lib/utils.ts) — `formatCurrency`, `cn` (Tailwind class merging)
- [src/lib/offline-queue.ts](src/lib/offline-queue.ts) — queues orders offline (localStorage); syncs via `/api/orders/sync`. Orders that fail 5+ times move to a dead-letter queue (`getDeadLetterQueue()`).
- [src/lib/nif.ts](src/lib/nif.ts) — NIF validation for CV and PT
- [src/lib/notifications.ts](src/lib/notifications.ts) — push/email notification helpers

### Database Migrations

SQL migrations live at the project root. Apply manually via Supabase dashboard SQL Editor — there is no automated runner. **Order matters:**

| File | Purpose |
|---|---|
| `supabase_rls_migration.sql` | Row-Level Security policies |
| `supabase_efatura_migration.sql` | E-Fatura sequences table + RPCs |
| `supabase_subscriptions_features_migration.sql` | Plan/feature matrix |
| `supabase_vinti4_merchant_ref_migration.sql` | `merchant_ref` column + index on `orders` |
| `supabase_efatura_atomic_migration.sql` | Audit columns on `efatura_sequences` |

### Localization

All UI is in **European Portuguese** (Portugal/Cabo Verde). Keep all user-facing strings in `pt-PT`.

### Path Alias

`@/*` maps to `./src/*`.
