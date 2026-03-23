import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createAndPayInvoice } from "@/lib/billing";
import { sendPaymentConfirmation } from "@/lib/email";

/**
 * POST /api/billing/record-payment
 * Superadmin regista um pagamento manual (transferência bancária, dinheiro, etc.)
 *
 * Body: { restaurantId, amount?, method, reference?, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const { restaurantId, amount, method, reference, notes } = await req.json();

    if (!restaurantId || !method) {
      return NextResponse.json({ error: "restaurantId e method são obrigatórios." }, { status: 400 });
    }

    const validMethods = ["manual", "vinti4", "stripe"];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: "Método inválido. Use: manual, vinti4 ou stripe." }, { status: 400 });
    }

    // Registar pagamento e renovar subscrição
    const { invoiceId, newExpiresAt } = await createAndPayInvoice({
      restaurantId,
      amount: amount ? Number(amount) : undefined,
      method,
      reference,
      notes,
    });

    // Enviar email de confirmação ao manager do restaurante (fire-and-forget)
    const { data: managerData } = await supabaseAdmin
      .from("users")
      .select("name, email:id")
      .eq("restaurant_id", restaurantId)
      .eq("role", "manager")
      .limit(1)
      .single();

    const { data: rest } = await supabaseAdmin
      .from("restaurants")
      .select("name, subscription_plan")
      .eq("id", restaurantId)
      .single();

    if (managerData && rest) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(managerData.email);
      if (authUser?.user?.email) {
        const { BILLING_AMOUNTS } = await import("@/lib/billing");
        const plan    = rest.subscription_plan || "starter";
        const paidAmt = amount ?? BILLING_AMOUNTS[plan]?.monthly ?? 1490;

        sendPaymentConfirmation({
          to:             authUser.user.email,
          restaurantName: rest.name,
          amount:         paidAmt,
          plan:           plan.charAt(0).toUpperCase() + plan.slice(1),
          newExpiresAt,
          reference,
        }).catch(err => console.error("[billing] Erro ao enviar email de confirmação:", err));
      }
    }

    return NextResponse.json({ success: true, invoiceId, newExpiresAt });

  } catch (err: any) {
    console.error("[billing/record-payment] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
