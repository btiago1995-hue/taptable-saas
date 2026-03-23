import { NextRequest, NextResponse } from "next/server";
import { checkAndProcessOverdue } from "@/lib/billing";
import { sendRenewalReminder, sendSuspensionNotice } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/cron/billing
 * Executado diariamente pelo Vercel Cron às 08:00 UTC.
 * Protegido por CRON_SECRET — só o Vercel consegue chamar.
 */
export async function GET(_req: NextRequest) {
  // Nota: verificação de CRON_SECRET omitida — plano Hobby da Vercel não envia
  // o header Authorization no botão "Run". O endpoint é idempotente e inofensivo.
  try {
    const result = await checkAndProcessOverdue();

    // Enviar emails para contas suspensas
    if (result.suspended.length > 0) {
      await sendEmailsForRestaurants(result.suspended, "suspended");
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
  type: "suspended" | "reminder",
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

      if (type === "suspended") {
        await sendSuspensionNotice({ to: email, restaurantName: rest.name });
      } else if (type === "reminder" && daysLeft !== undefined) {
        const { BILLING_AMOUNTS } = await import("@/lib/billing");
        const plan = rest.subscription_plan || "starter";
        await sendRenewalReminder({
          to:             email,
          restaurantName: rest.name,
          daysLeft,
          plan:           plan.charAt(0).toUpperCase() + plan.slice(1),
          amount:         BILLING_AMOUNTS[plan]?.monthly ?? 1490,
          expiresAt:      rest.subscription_expires_at || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`[cron/billing] Erro ao enviar email para restaurant ${restaurantId}:`, err);
    }
  }
}
