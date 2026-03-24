# Decisões do Projecto

Registo de decisões técnicas e de produto tomadas ao longo do desenvolvimento.

---

## Arquitectura

- **Stack:** Next.js App Router + TypeScript + Supabase + Tailwind CSS v4
- **Tenancy:** Um restaurante = um tenant, isolado via RLS no Supabase
- **Two Supabase clients:** `supabasePublic` (RLS) para frontend, `supabaseAdmin` (service role) só em API routes
- **Deploy:** Vercel (produção em `orbital-event.vercel.app`)

## Produto

- **PWA em vez de app nativa:** Decisão de manter como Web App / PWA para os tablets e telemóveis. App Android nativa só quando houver +50 clientes activos a pedirem.
- **Vinti4Net como gateway principal:** Gateway local para CV/PT. Stripe como secundário.
- **Multi-store via junction table:** `user_restaurant_access` + `switchRestaurant()` persiste em `users.restaurant_id` — sem quebrar APIs existentes.
- **Emails via Resend + React Email:** Templates em `src/lib/email-templates/`, sem SDK adicional no frontend.
- **Cron jobs no Vercel:** Trial check às 9h UTC diário, billing às 8h UTC diário — configurados em `vercel.json`.

## Fiscal

- **E-Fatura:** IUD de 45 chars (NIF+DocType+Ano+Seq+Hash). Sequência atómica via RPC `efatura_next_sequence`.
- **EFATURA_ENV=dev** por enquanto — muda para `production` após certificado RSA da DNRE.
- **Homologação DNRE:** Email enviado em Março 2026. Aguardar resposta.

## Segurança

- **Superadmin:** Protegido por `x-superadmin-secret` header (`SUPERADMIN_SECRET` env var).
- **Cron:** Protegido por `x-cron-secret` header (`CRON_SECRET` env var).
- **assign-driver:** Validação de sessão + verificação de ownership do restaurante.

## Domínio

- **`dineo.cv`** é o domínio alvo — disponível por $118/ano no Dynadot (premium). A comprar em breve.
- Enquanto isso: `orbital-event.vercel.app` em produção.
- Resend configurado com domínio `dineo.cv` (aguarda DNS após compra).
