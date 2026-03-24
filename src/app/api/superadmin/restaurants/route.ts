import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function isSuperadmin(req: NextRequest): boolean {
  const secret = process.env.SUPERADMIN_SECRET;
  if (!secret) return false; // Must be configured
  return req.headers.get("x-superadmin-secret") === secret;
}

/**
 * GET /api/superadmin/restaurants
 * Devolve todos os restaurantes com stats de pedidos.
 * Usa supabaseAdmin para bypassar RLS — apenas para uso interno do superadmin.
 */
export async function GET(req: NextRequest) {
  if (!isSuperadmin(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
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

    // Fetch managers + multi-store info
    const { data: managers } = await supabaseAdmin
      .from("users")
      .select("restaurant_id, name, id")
      .eq("role", "manager");

    const { data: allAccess } = await supabaseAdmin
      .from("user_restaurant_access")
      .select("user_id, restaurant_id");

    // Count how many restaurants each user has access to
    const userRestCount: Record<string, number> = {};
    (allAccess || []).forEach((row: any) => {
      userRestCount[row.user_id] = (userRestCount[row.user_id] || 0) + 1;
    });

    // Map restaurant_id → manager info
    const managerMap: Record<string, { name: string; id: string; locationCount: number }> = {};
    (managers || []).forEach((m: any) => {
      managerMap[m.restaurant_id] = {
        name: m.name,
        id: m.id,
        locationCount: userRestCount[m.id] || 1,
      };
    });

    const enrichedRestaurants = restaurants.map(r => ({
      ...r,
      manager_name: managerMap[r.id]?.name || null,
      manager_id:   managerMap[r.id]?.id   || null,
      location_count: managerMap[r.id]?.locationCount || 1,
    }));

    return NextResponse.json({ restaurants: enrichedRestaurants, orders: orders || [] });
  } catch (err: any) {
    console.error("[superadmin/restaurants]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
