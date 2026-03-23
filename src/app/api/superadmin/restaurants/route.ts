import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/superadmin/restaurants
 * Devolve todos os restaurantes com stats de pedidos.
 * Usa supabaseAdmin para bypassar RLS — apenas para uso interno do superadmin.
 */
export async function GET() {
  try {
    const [{ data: restaurants, error: restErr }, { data: orders, error: orderErr }] =
      await Promise.all([
        supabaseAdmin
          .from("restaurants")
          .select("id, name, slug, is_active, created_at, subscription_plan, subscription_billing, subscription_expires_at, subscription_status"),
        supabaseAdmin
          .from("orders")
          .select("restaurant_id, total_amount, created_at")
          .eq("payment_status", "paid"),
      ]);

    if (restErr) throw new Error(restErr.message);
    if (orderErr) throw new Error(orderErr.message);

    return NextResponse.json({ restaurants: restaurants || [], orders: orders || [] });
  } catch (err: any) {
    console.error("[superadmin/restaurants]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
