import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/retencoes?year=2025&month=3
 * Returns IRS/IRC withholdings for the authenticated restaurant.
 *
 * POST /api/retencoes
 * Creates a withholding record for a B2B invoice.
 * Body: { orderId, entityName, entityNif, baseAmount, type, rate, invoiceRef }
 */

async function getRestaurantId(req: NextRequest): Promise<string | null> {
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
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  return profile?.restaurant_id || null;
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year  = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    const { data, error } = await supabaseAdmin
      .from("irs_irc_retencoes")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("year", year)
      .eq("month", month)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const totals = (data || []).reduce(
      (acc, r) => {
        acc.total    += Number(r.retained_amount);
        acc.totalIRS += r.type === "IRS" ? Number(r.retained_amount) : 0;
        acc.totalIRC += r.type === "IRC" ? Number(r.retained_amount) : 0;
        return acc;
      },
      { total: 0, totalIRS: 0, totalIRC: 0 }
    );

    return NextResponse.json({ retencoes: data || [], totals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { orderId, entityName, entityNif, baseAmount, type, rate, invoiceRef } = await req.json();

    if (!entityName || !entityNif || !baseAmount || !type || !rate) {
      return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 });
    }

    const now = new Date();
    const retainedAmount = Number(baseAmount) * Number(rate) / 100;

    const { data, error } = await supabaseAdmin
      .from("irs_irc_retencoes")
      .insert({
        restaurant_id:   restaurantId,
        order_id:        orderId || null,
        month:           now.getMonth() + 1,
        year:            now.getFullYear(),
        type,
        entity_name:     entityName,
        entity_nif:      entityNif,
        base_amount:     Number(baseAmount),
        rate:            Number(rate),
        retained_amount: retainedAmount,
        invoice_ref:     invoiceRef || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, retencao: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
