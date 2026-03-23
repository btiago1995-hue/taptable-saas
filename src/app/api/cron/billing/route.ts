import { NextRequest, NextResponse } from "next/server";
import { checkAndProcessOverdue } from "@/lib/billing";
import { sendRenewalReminder, sendSuspensionNotice, sendDunningEmail } from "@/lib/email";
import { sendWhatsApp, msgDunning } from "@/lib/whatsapp";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/cron/billing
 * Executado diariamente pelo Vercel Cron às 08:00 UTC.
 * Protegido por CRON_SECRET — Vercel envia Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth    = req.headers.get("authorization");
    const cronHdr = req.headers.get("x-cron-secret");
    if (auth !== `Bearer ${secret}` && cronHdr !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await checkAndProcessOverdue();

    // Enviar emails para contas suspensas
    if (result.suspended.length > 0) {
      await sendEmailsForRestaurants(result.suspended, "suspended");
    }

    // Dunning dia 1 — acabaram de entrar em past_due
    if (result.movedToPastDue.length > 0) {
      await sendEmailsForRestaurants(result.movedToPastDue, "dunning", 5);
    }

    // Dunning dia 3 — past_due há ~3 dias, suspensão em ~2 dias
    if (result.dunning3d.length > 0) {
      await sendEmailsForRestaurants(result.dunning3d, "dunning", 2);
    }

    // Enviar lembretes de renovação
    const reminders = [
      { ids: result.reminders7d, daysLeft: 7 },
      { ids: result.reminders3d, daysLeft: 3 },
      { ids: result.reminders1d, daysLeft: 1 },
    ];

    for (const { ids, daysLeft } of reminders) {
      if (ids.length > 0) {
        await sendEmailsForRestaurants(ids, "reminder", daysLeft);
      }
    }

    console.log("[cron/billing] Resultado:", JSON.stringify(result));

    return NextResponse.json({
      success: true,
      ...result,
      totalProcessed:
        result.suspended.length +
        result.movedToPastDue.length +
        result.reminders7d.length +
        result.reminders3d.length +
        result.reminders1d.length,
    });

  } catch (err: any) {
    console.error("[cron/billing] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function sendEmailsForRestaurants(
  restaurantIds: string[],
  type: "suspended" | "reminder" | "dunning",
  daysLeft?: number
) {
  // Buscar emails dos managers de cada restaurante
  for (const restaurantId of restaurantIds) {
    try {
      const { data: rest } = await supabaseAdmin
        .from("restaurants")
        .select("name, subscription_plan, subscription_expires_at")
        .eq("id", restaurantId)
        .single();

      const { data: manager } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("role", "manager")
        .limit(1)
        .single();

      if (!rest || !manager) continue;

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(manager.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      const { BILLING_AMOUNTS } = await import("@/lib/billing");
      const plan       = rest.subscription_plan || "starter";
      const planLabel  = plan.charAt(0).toUpperCase() + plan.slice(1);
      const amount     = BILLING_AMOUNTS[plan]?.monthly ?? 1490;

      if (type === "suspended") {
        await sendSuspensionNotice({ to: email, restaurantName: rest.name });
      } else if (type === "dunning" && daysLeft !== undefined) {
        await sendDunningEmail({
          to:                  email,
          restaurantName:      rest.name,
          plan:                planLabel,
          amount,
          daysUntilSuspension: daysLeft,
        });
        // WhatsApp dunning — complemento ao email (fire-and-forget)
        // Usa o telefone do manager se estiver no perfil Supabase Auth
        if (authUser?.user?.phone) {
          const billingUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dineo.cv") + "/admin/billing";
          sendWhatsApp(authUser.user.phone, msgDunning(rest.name, daysLeft, billingUrl))
            .catch(err => console.error("[dunning] Erro WhatsApp:", err));
        }
      } else if (type === "reminder" && daysLeft !== undefined) {
        await sendRenewalReminder({
          to:             email,
          restaurantName: rest.name,
          daysLeft,
          plan:           planLabel,
          amount,
          expiresAt:      rest.subscription_expires_at || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[cron/billing] Erro ao enviar email para restaurant ${restaurantId}:`, err);
    }
  }
}
