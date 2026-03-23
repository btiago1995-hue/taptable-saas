import { NextRequest, NextResponse } from "next/server";

/**
 * Edge Middleware — Rate Limiting por IP
 *
 * Sliding window in-memory por instância Edge.
 * Protege endpoints sensíveis contra brute force e spam.
 *
 * Limites por categoria:
 *   onboarding/contacto — 5 req / 10 min  (registo e formulários)
 *   auth (login)        — 10 req / 5 min   (brute force passwords)
 *   api geral           — 120 req / min    (uso normal da app)
 *   vinti4/webhook      — sem limite        (chamado pelo SISP)
 *   cron/*              — sem limite        (autenticado por CRON_SECRET)
 */

type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now  = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= limit) return false; // blocked

  entry.count++;
  return true; // allowed
}

// Limpar entradas expiradas periodicamente (evitar memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k);
  }
}, 60_000);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Webhooks SISP e crons — não limitar
  if (
    pathname.startsWith("/api/vinti4/webhook") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/emails/trial-check")
  ) {
    return NextResponse.next();
  }

  // IP do cliente (Vercel passa x-forwarded-for)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // ── Onboarding e contacto — 5 req / 10 min ──────────────────────────────
  if (
    pathname.startsWith("/api/onboarding") ||
    pathname.startsWith("/api/contacto")
  ) {
    if (!rateLimit(`${ip}:slow:${pathname}`, 5, 10 * 60_000)) {
      return NextResponse.json(
        { error: "Demasiados pedidos. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }
    return NextResponse.next();
  }

  // ── Login / auth — 10 req / 5 min ───────────────────────────────────────
  if (pathname.startsWith("/api/auth") || pathname === "/admin/login") {
    if (!rateLimit(`${ip}:auth`, 10, 5 * 60_000)) {
      return NextResponse.json(
        { error: "Demasiadas tentativas de autenticação. Aguarde 5 minutos." },
        { status: 429 }
      );
    }
    return NextResponse.next();
  }

  // ── API geral — 120 req / min ────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (!rateLimit(`${ip}:api`, 120, 60_000)) {
      return NextResponse.json(
        { error: "Rate limit excedido. Tente novamente em breve." },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/login"],
};
