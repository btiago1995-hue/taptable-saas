import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/drivers?restaurantId=xxx
 * Returns all driver-role staff for a restaurant.
 */
export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .eq("role", "driver");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drivers: data || [] });
}
