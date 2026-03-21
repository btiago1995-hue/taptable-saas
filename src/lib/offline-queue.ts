/**
 * offline-queue.ts
 * 
 * Sistema de fila offline para pedidos.
 * Guarda pedidos em localStorage quando não há internet.
 * Sincroniza automaticamente quando a ligação é restaurada.
 */

const OFFLINE_QUEUE_KEY = "dineo_offline_queue";

export interface OfflineOrder {
  id: string;
  restaurantId: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "delivery" | "pickup";
  items: { id: string; name: string; price: number; quantity: number }[];
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  createdAt: string; // ISO string
  syncAttempts: number;
}

/** Adds an order to the offline queue */
export function queueOfflineOrder(order: Omit<OfflineOrder, "syncAttempts">): void {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue();
  queue.push({ ...order, syncAttempts: 0 });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  console.log(`[OfflineQueue] Order ${order.id} queued. Queue size: ${queue.length}`);
}

/** Returns the current offline queue */
export function getOfflineQueue(): OfflineOrder[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Removes successfully synced orders from the queue */
export function removeFromQueue(orderId: string): void {
  if (typeof window === "undefined") return;
  const queue = getOfflineQueue().filter((o) => o.id !== orderId);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

/** Clears the entire offline queue */
export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/** 
 * Syncs all queued offline orders to Supabase.
 * Call this when internet is restored.
 * Returns the number of successfully synced orders.
 */
export async function syncOfflineOrders(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  console.log(`[OfflineQueue] Syncing ${queue.length} queued order(s)...`);
  let synced = 0;

  for (const order of queue) {
    try {
      const response = await fetch("/api/orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      if (response.ok) {
        removeFromQueue(order.id);
        synced++;
        console.log(`[OfflineQueue] Order ${order.id} synced successfully.`);
      } else {
        console.warn(`[OfflineQueue] Failed to sync order ${order.id}: ${response.status}`);
      }
    } catch (err) {
      console.error(`[OfflineQueue] Network error syncing order ${order.id}:`, err);
    }
  }

  console.log(`[OfflineQueue] Sync complete. ${synced}/${queue.length} synced.`);
  return synced;
}
