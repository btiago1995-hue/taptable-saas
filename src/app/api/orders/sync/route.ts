import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/orders/sync
 * Receives an offline-queued order and inserts it into Supabase.
 * Called automatically by the OfflineBanner sync mechanism.
 */
export async function POST(req: Request) {
  try {
    const order = await req.json();

    if (!order?.id || !order?.restaurantId) {
      return NextResponse.json({ error: "Invalid order payload" }, { status: 400 });
    }

    // Check if order already exists (idempotency — avoid duplicates if sync runs twice)
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", order.id)
      .single();

    if (existing) {
      return NextResponse.json({ message: "Order already synced", id: order.id }, { status: 200 });
    }

    const { error } = await supabaseAdmin.from("orders").insert({
      id: order.id,
      restaurant_id: order.restaurantId,
      table_number: order.tableNumber || null,
      order_type: order.orderType,
      items: order.items,
      total_amount: order.totalAmount,
      customer_name: order.customerName || null,
      customer_phone: order.customerPhone || null,
      delivery_address: order.deliveryAddress || null,
      payment_method: order.paymentMethod,
      status: "new",
      created_at: order.createdAt,
      is_offline_sync: true, // Flag to identify synced orders in analytics
    });

    if (error) {
      console.error("[Sync API] Supabase insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: order.id });
  } catch (err: any) {
    console.error("[Sync API] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error", details: err.message }, { status: 500 });
  }
}
