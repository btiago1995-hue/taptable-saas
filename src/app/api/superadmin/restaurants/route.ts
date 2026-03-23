import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/superadmin/restaurants
 * Devolve todos os restaurantes com stats de pedidos.
 * Usa supabaseAdmin para bypassar RLS — apenas para uso interno do superadmin.
 */
export async function GET() {
  try {
    // Tenta com subscription_status (requer migration billing aplicada)
    // Se falhar, tenta sem essa coluna (migration ainda não aplicada)
    let restaurants: any[] = [];
    let restErr: any = null;

    const withStatus = await supabaseAdmin
      .from("restaurants")
      .select("id, name, is_active, created_at, subscription_plan, subscription_billing, subscription_expires_at, subscription_status");

    if (withStatus.error) {
      // Fallback sem subscription_status
      console.warn("[superadmin/restaurants] subscription_status não disponível, a usar fallback:", withStatus.error.message);
      const fallback = await supabaseAdmin
        .from("restaurants")
        .select("id, name, is_active, created_at, subscription_plan, subscription_billing, subscription_expires_at");
      if (fallback.error) restErr = fallback.error;
      else restaurants = (fallback.data || []).map(r => ({ ...r, subscription_status: "trial" }));
    } else {
      restaurants = withStatus.data || [];
    }

    if (restErr) throw new Error(restErr.message);

    const { data: orders, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("restaurant_id, total_amount, created_at")
      .eq("payment_status", "paid");

    if (orderErr) throw new Error(orderErr.message);

    return NextResponse.json({ restaurants, orders: orders || [] });
  } catch (err: any) {
    console.error("[superadmin/restaurants]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
