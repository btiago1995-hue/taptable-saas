/**
 * notifications.ts
 * 
 * Helper central para envio de notificações ao cliente.
 * Chama o endpoint do WhatsApp quando o status do pedido muda.
 */

/**
 * Triggers a WhatsApp/SMS notification for a given order status change.
 * Silently fails to avoid disrupting the kitchen workflow.
 */
export async function triggerOrderNotification(
  orderId: string,
  newStatus: "order_placed" | "preparing" | "ready" | "out_for_delivery" | "delivered"
): Promise<void> {
  try {
    const response = await fetch("/api/webhook/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, newStatus }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.mocked) {
        console.log(`[Notifications] Mock send for order ${orderId} (status: ${newStatus}). Set WHATSAPP_API_URL to send real messages.`);
      } else {
        console.log(`[Notifications] WhatsApp sent for order ${orderId} (status: ${newStatus}).`);
      }
    } else {
      console.warn(`[Notifications] Failed to send notification for order ${orderId}: ${response.status}`);
    }
  } catch (err) {
    // Silently fail — kitchen ops must not be disrupted by notification errors
    console.error("[Notifications] Error triggering notification:", err);
  }
}
