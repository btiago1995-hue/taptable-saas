import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/restaurants/add-location
 * Creates a new restaurant location and links it to the authenticated manager.
 * Requires Pro plan (multi_store feature).
 * Body: { name, nif, address }
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      supabaseAuth.auth.setSession({
        access_token: authHeader.replace("Bearer ", ""),
        refresh_token: "",
      });
    }

    const { data: { user: sessionUser } } = await supabaseAuth.auth.getUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Get current user profile + plan
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("restaurant_id, role, restaurants(subscription_plan)")
      .eq("id", sessionUser.id)
      .single();

    if (!profile || profile.role !== "manager") {
      return NextResponse.json({ error: "Apenas managers podem adicionar unidades" }, { status: 403 });
    }

    const plan = (profile.restaurants as any)?.subscription_plan || "starter";
    if (plan !== "pro") {
      return NextResponse.json({ error: "Plano PRO necessário para multi-store" }, { status: 403 });
    }

    const { name, nif, address } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Nome da unidade é obrigatório" }, { status: 400 });
    }

    // Create the new restaurant — inherit plan from current restaurant
    const { data: newRestaurant, error: createError } = await supabaseAdmin
      .from("restaurants")
      .insert({
        name,
        nif_number: nif || null,
        address: address || null,
        subscription_plan: plan,
        subscription_status: "active",
        is_active: true,
      })
      .select()
      .single();

    if (createError || !newRestaurant) {
      return NextResponse.json({ error: createError?.message || "Erro ao criar unidade" }, { status: 500 });
    }

    // Link the manager to the new restaurant
    await supabaseAdmin
      .from("user_restaurant_access")
      .insert({ user_id: sessionUser.id, restaurant_id: newRestaurant.id });

    return NextResponse.json({ success: true, restaurant: newRestaurant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
