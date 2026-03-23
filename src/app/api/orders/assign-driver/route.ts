import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/whatsapp";

/**
 * POST /api/orders/assign-driver
 * Assigns a driver to a delivery order and sets status to "delivering".
 * Body: { orderId, driverId, driverName }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, driverId, driverName } = await req.json();

    if (!orderId || !driverId || !driverName) {
      return NextResponse.json({ error: "Missing orderId, driverId or driverName" }, { status: 400 });
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, customer_phone, customer_name, delivery_address, restaurants(name)")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        assigned_driver_id: driverId,
        assigned_driver_name: driverName,
        status: "delivering",
      })
      .eq("id", orderId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify customer via WhatsApp (fire-and-forget)
    if (order.customer_phone) {
      const restaurantName = (order.restaurants as any)?.name || "Restaurante";
      const shortId = orderId.substring(0, 8).toUpperCase();
      sendWhatsApp(
        order.customer_phone,
        `🛵 O seu pedido *#${shortId}* de *${restaurantName}* está a caminho!\nEntregador: *${driverName}*\nEndereço: ${order.delivery_address || "—"}`
      ).catch(err => console.error("[assign-driver] WhatsApp error:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[assign-driver] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
