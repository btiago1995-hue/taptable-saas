import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendTrialWarningEmail } from "@/lib/email";
import { BILLING_AMOUNTS } from "@/lib/billing";

/**
 * GET /api/emails/trial-check
 * Cron diário — envia avisos de expiração de trial a restaurantes com trial
 * a expirar em exactamente 7, 3, 1 ou 0 dias.
 *
 * Protegido por header: x-cron-secret: <CRON_SECRET>
 * Configurar cron em cron-job.org às 9h UTC com esse header.
 */
export async function GET(req: NextRequest) {
  // ── Autenticação do cron ──────────────────────────────────────────────────
  // Vercel Cron envia: Authorization: Bearer <CRON_SECRET>
  // Chamada manual pode usar: x-cron-secret: <CRON_SECRET>
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const bearerOk = authHeader === `Bearer ${secret}`;
    const headerOk = cronHeader === secret;
    if (!bearerOk && !headerOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();

    // Datas alvo: hoje, +1, +3, +7 dias (início e fim do dia UTC)
    const targets = [0, 1, 3, 7].map((offset) => {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + offset);
      const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
      const dayEnd   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
      return { offset, dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString() };
    });

    const processed: string[] = [];

    for (const { offset, dayStart, dayEnd } of targets) {
      // Buscar restaurantes em trial com subscription_expires_at nesta janela de dia
      const { data: restaurants, error } = await supabaseAdmin
        .from("restaurants")
        .select("id, name, subscription_plan, subscription_billing, subscription_expires_at, users!inner(id, role)")
        .eq("subscription_status", "trial")
        .gte("subscription_expires_at", dayStart)
        .lte("subscription_expires_at", dayEnd)
        .eq("users.role", "manager");

      if (error) {
        console.error(`[trial-check] Erro ao buscar restaurantes (+${offset} dias):`, error.message);
        continue;
      }

      if (!restaurants || restaurants.length === 0) continue;

      for (const rest of restaurants as any[]) {
        const manager = Array.isArray(rest.users) ? rest.users[0] : rest.users;
        if (!manager?.id) continue;

        // Buscar email do manager via Auth Admin API
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(manager.id);
        const managerEmail = authUser?.user?.email;
        if (!managerEmail) continue;

        const plan    = rest.subscription_plan  || "starter";
        const cycle   = rest.subscription_billing || "monthly";
        const amount  = BILLING_AMOUNTS[plan]?.[cycle] ?? BILLING_AMOUNTS.starter.monthly;

        sendTrialWarningEmail({
          to:             managerEmail,
          restaurantName: rest.name,
          daysLeft:       offset,
          plan:           plan.charAt(0).toUpperCase() + plan.slice(1),
          amount,
          expiresAt:      rest.subscription_expires_at,
        }).catch(err => console.error(`[trial-check] Erro ao enviar email para ${managerEmail}:`, err));

        processed.push(`${rest.name} (+${offset}d)`);
        console.log(`[trial-check] Email enviado: ${rest.name} → ${managerEmail} (+${offset} dias)`);
      }
    }

    return NextResponse.json({ success: true, processed: processed.length, details: processed });

  } catch (err: any) {
    console.error("[trial-check] Erro global:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
