import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  sendWhatsApp,
  msgOrderPreparing,
  msgOrderReady,
  msgOrderDelivered,
  msgOrderPlaced,
} from "@/lib/whatsapp";

/**
 * POST /api/webhook/whatsapp
 * Envia notificação WhatsApp ao cliente quando o status do pedido muda.
 *
 * Body: { orderId, newStatus }
 * newStatus: "preparing" | "ready" | "out_for_delivery" | "delivered" | "order_placed"
 *
 * Chamado pelo KDS (kitchen/page.tsx) e pela rota de criação de pedidos delivery.
 * Falha silenciosamente — nunca deve bloquear operações de cozinha.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, newStatus } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Missing orderId or newStatus" }, { status: 400 });
    }

    // Usar supabaseAdmin para evitar problemas de RLS em routes server-side
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_type, customer_phone, restaurants(name)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.customer_phone) {
      return NextResponse.json({ message: "No customer phone, skipping." });
    }

    const restaurantName = (order.restaurants as any)?.name || "Restaurante";
    const shortId        = orderId.substring(0, 8).toUpperCase();
    const orderType      = order.order_type || "in_store";

    let message = "";

    switch (newStatus) {
      case "order_placed":
        message = msgOrderPlaced(restaurantName, shortId, orderType);
        break;
      case "preparing":
        message = msgOrderPreparing(restaurantName, shortId);
        break;
      case "ready":
      case "out_for_delivery":
        message = msgOrderReady(restaurantName, shortId, orderType);
        break;
      case "delivered":
        message = msgOrderDelivered(restaurantName, shortId);
        break;
      default:
        return NextResponse.json({ message: `Ignored status: ${newStatus}` });
    }

    // Fire-and-forget — não bloquear resposta
    sendWhatsApp(order.customer_phone, message)
      .catch(err => console.error("[WhatsApp] Erro ao enviar:", err));

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[WhatsApp webhook] Erro:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
