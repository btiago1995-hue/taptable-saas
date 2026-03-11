"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

export type OrderStatus = "new" | "preparing" | "ready" | "delivered";
export type PaymentMethod = "apple_pay" | "card" | "cash" | "pix";
export type PaymentStatus = "paid" | "pending";

export interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface LiveOrder {
    id: string;
    restaurantId: string;
    tableNumber: number;
    items: OrderItem[];
    deliveredItemIds: string[];
    subtotal: number;
    tip: number;
    totalAmount: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    orderType?: "in_store" | "delivery" | "pickup";
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    deliveryFee?: number;
    createdAt: string;
}

interface OrderContextType {
    orders: LiveOrder[];
    placeOrder: (
        targetRestaurantId: string, // Kept for compatibility, but context will prefer route/auth tenant 
        tableNumber: number,
        items: OrderItem[],
        subtotal: number,
        tip: number,
        paymentMethod?: PaymentMethod,
        paymentStatus?: PaymentStatus,
        orderType?: "in_store" | "delivery" | "pickup",
        customerName?: string,
        customerPhone?: string,
        deliveryAddress?: string,
        deliveryFee?: number
    ) => void;
    updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
    updatePaymentStatus: (orderId: string, newStatus: PaymentStatus) => void;
    markItemDelivered: (orderId: string, itemId: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const [orders, setOrders] = useState<LiveOrder[]>([]);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

        // 1. Resolve Active Tenant ID (from Auth or URL)
    useEffect(() => {
        let activeId = user?.restaurantId || null;

        if (!activeId && pathname?.includes("/p/")) {
            const parts = pathname.split("/");
            const pIndex = parts.indexOf("p");
            if (pIndex !== -1 && parts.length > pIndex + 1) {
                activeId = parts[pIndex + 1];
            }
        }

        if (activeId !== restaurantId) {
            setRestaurantId(activeId);
            setOrders([]); // Clear orders when switching tenants
        }
    }, [user?.restaurantId, pathname, restaurantId]);

    // 2. Initial Load & Realtime Subscription scoped to Tenant
    useEffect(() => {
        if (!restaurantId) return;

        let subscription: any;

        const fetchOrders = async () => {
            const { data: dbOrders, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('restaurant_id', restaurantId)
                .order('created_at', { ascending: true });

            if (dbOrders) {
                const formatted = dbOrders.map(mapDbOrderToLiveOrder);
                setOrders(formatted);
            }

            // Subscribe to realtime updates on orders table
            subscription = supabase
                .channel('realtime_orders')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // The payload.new contains the raw order, but we also need its items
                        const { data: fullOrder } = await supabase
                            .from('orders')
                            .select('*, order_items(*)')
                            .eq('id', payload.new.id)
                            .single();
                            
                        if (fullOrder) {
                            setOrders(prev => {
                                // Prevent duplicates if the order is already in state
                                if (prev.some(o => o.id === fullOrder.id)) return prev;
                                return [...prev, mapDbOrderToLiveOrder(fullOrder)];
                            });
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        // Fetch the full structure to guarantee React UI doesn't crash from missing nested data
                        const { data: fullOrder } = await supabase
                            .from('orders')
                            .select('*, order_items(*)')
                            .eq('id', payload.new.id)
                            .single();

                        if (fullOrder) {
                            setOrders(prev => prev.map(o => 
                                o.id === payload.new.id ? mapDbOrderToLiveOrder(fullOrder) : o
                            ));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_items' }, (payload) => {
                    console.log('🔄 Realtime Item Update:', payload);
                    setOrders(prev => prev.map(o => {
                        if (o.id !== payload.new.order_id) return o;
                        const deliveredSet = new Set(o.deliveredItemIds);
                        if (payload.new.delivered) {
                            deliveredSet.add(payload.new.id);
                        } else {
                            deliveredSet.delete(payload.new.id);
                        }
                        return { ...o, deliveredItemIds: Array.from(deliveredSet) };
                    }));
                })
                .subscribe();
        };

        fetchOrders();

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [restaurantId]);

    const mapDbOrderToLiveOrder = (dbOrder: any): LiveOrder => {
        const items = dbOrder.order_items ? dbOrder.order_items.map((i: any) => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity
        })) : [];

        const deliveredItemIds = dbOrder.order_items ? dbOrder.order_items.filter((i: any) => i.delivered).map((i: any) => i.id) : [];

        return {
            id: dbOrder.id,
            restaurantId: dbOrder.restaurant_id,
            tableNumber: dbOrder.table_number || 0,
            items: items,
            deliveredItemIds: deliveredItemIds,
            subtotal: dbOrder.subtotal,
            tip: dbOrder.tip,
            totalAmount: dbOrder.total_amount,
            status: dbOrder.status,
            paymentMethod: dbOrder.payment_method,
            paymentStatus: dbOrder.payment_status,
            orderType: dbOrder.order_type,
            customerName: dbOrder.customer_name,
            customerPhone: dbOrder.customer_phone,
            deliveryAddress: dbOrder.delivery_address,
            deliveryFee: dbOrder.delivery_fee,
            createdAt: dbOrder.created_at
        };
    };

    const placeOrder = async (
        targetRestaurantId: string,
        tableNumber: number,
        items: OrderItem[],
        subtotal: number,
        tip: number,
        paymentMethod: PaymentMethod = "card",
        paymentStatus: PaymentStatus = "paid",
        orderType: "in_store" | "delivery" | "pickup" = "in_store",
        customerName?: string,
        customerPhone?: string,
        deliveryAddress?: string,
        deliveryFee?: number
    ) => {
        // Fallback to targetRestaurantId or the resolved restaurantId context
        const finalRestId = targetRestaurantId || restaurantId;
        if (!finalRestId) return;

        const newOrderData = {
            restaurant_id: finalRestId,
            table_number: tableNumber,
            subtotal,
            tip,
            total_amount: subtotal + tip + (deliveryFee || 0),
            status: "new",
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            order_type: orderType,
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_address: deliveryAddress,
            delivery_fee: deliveryFee || 0
        };

        const { data: insertedOrder, error: orderErr } = await supabase.from('orders').insert([newOrderData]).select('id').single();
        if (orderErr || !insertedOrder) {
            console.error("Failed to place order", orderErr);
            return;
        }

        const orderItemsData = items.map(item => ({
            order_id: insertedOrder.id,
            menu_item_id: item.id.includes('-') ? item.id : null,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));

        await supabase.from('order_items').insert(orderItemsData);
    };

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (newStatus === "delivered") {
            await supabase.from('order_items').update({ delivered: true }).eq('order_id', orderId);
        }
    };

    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        await supabase.from('orders').update({ payment_status: newStatus }).eq('id', orderId);
    };

    const markItemDelivered = async (orderId: string, itemId: string) => {
        setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                const newDelivered = [...o.deliveredItemIds, itemId];
                const allDelivered = o.items.every(i => newDelivered.includes(i.id));
                return { ...o, deliveredItemIds: newDelivered, status: allDelivered ? "delivered" : o.status };
            }
            return o;
        }));

        await supabase.from('order_items').update({ delivered: true }).eq('id', itemId);

        const currentOrder = orders.find(o => o.id === orderId);
        if (currentOrder) {
            const allWillBeDelivered = currentOrder.items.every(i => currentOrder.deliveredItemIds.includes(i.id) || i.id === itemId);
            if (allWillBeDelivered) {
                await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
            }
        }
    };

    return (
        <OrderContext.Provider value={{ orders, placeOrder, updateOrderStatus, updatePaymentStatus, markItemDelivered }}>
            {children}
        </OrderContext.Provider>
    );
}

export function useOrders() {
    const context = useContext(OrderContext);
    if (context === undefined) {
        throw new Error("useOrders must be used within an OrderProvider");
    }
    return context;
}
