"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

export type OrderStatus = "new" | "preparing" | "ready" | "delivering" | "delivered";
export type PaymentMethod = "apple_pay" | "card" | "cash" | "pix" | "vinti4";
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
    customerNif?: string;
    deliveryAddress?: string;
    deliveryFee?: number;
    orderNumber?: string;
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
        customerNif?: string,
        deliveryAddress?: string,
        deliveryFee?: number
    ) => Promise<{ orderId: string; orderNumber: string } | void>;
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
                .channel(`realtime_orders_${restaurantId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Adding a short delay because the client inserts 'orders' then 'order_items' sequentially.
                        // We must wait for 'order_items' to commit before fetching the full joined object.
                        setTimeout(async () => {
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
                        }, 800);
                    } else if (payload.eventType === 'UPDATE') {
                        // Fast merge operation. Do not do a huge API heavy select fetch 
                        // as it causes state wiping race conditions. 
                        setOrders(prev => {
                            if (!prev.some(o => o.id === payload.new.id)) {
                                // Edge Case: we missed the INSERT, so we slowly fetch it.
                                setTimeout(async () => {
                                    const { data: fullOrder } = await supabase.from('orders').select('*, order_items(*)').eq('id', payload.new.id).single();
                                    if (fullOrder) {
                                        setOrders(curr => {
                                            if (curr.some(x => x.id === fullOrder.id)) return curr;
                                            return [...curr, mapDbOrderToLiveOrder(fullOrder)].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                        });
                                    }
                                }, 500);
                                return prev;
                            }
                            
                            // Normal Flow: Instantly merge lightweight update payload
                            return prev.map(o => {
                                if (o.id === payload.new.id) {
                                    return {
                                        ...o,
                                        status: payload.new.status,
                                        paymentStatus: payload.new.payment_status,
                                        paymentMethod: payload.new.payment_method,
                                        tableNumber: payload.new.table_number,
                                    };
                                }
                                return o;
                            });
                        });
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
            customerNif: dbOrder.customer_nif,
            deliveryAddress: dbOrder.delivery_address,
            deliveryFee: dbOrder.delivery_fee,
            orderNumber: dbOrder.order_number,
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
        customerNif?: string,
        deliveryAddress?: string,
        deliveryFee?: number
    ) => {
        // Fallback to targetRestaurantId or the resolved restaurantId context
        const finalRestId = targetRestaurantId || restaurantId;
        if (!finalRestId) return;

        const orderNumber = Math.random().toString(36).substring(2, 6).toUpperCase(); // e.g., "A4F9"

        // ====== 1. TENTATIVA ATÓMICA DE ALTA VELOCIDADE ======
        const payload = {
            p_restaurant_id: finalRestId,
            p_table_number: tableNumber,
            p_subtotal: subtotal,
            p_tip: tip,
            p_total_amount: subtotal + tip + (deliveryFee || 0),
            p_status: "new",
            p_payment_method: paymentMethod,
            p_payment_status: paymentStatus,
            p_order_type: orderType,
            p_customer_name: customerName || null,
            p_customer_phone: customerPhone || null,
            p_customer_nif: customerNif || null,
            p_delivery_address: deliveryAddress || null,
            p_delivery_fee: deliveryFee || 0,
            p_order_number: orderNumber,
            p_items: items.map(i => ({ 
                menu_item_id: i.id.includes('-') ? i.id : null, 
                name: i.name, 
                price: i.price, 
                quantity: i.quantity 
            }))
        };

        const { data: insertedOrderId, error: rpcError } = await supabase.rpc('place_new_order_transaction', payload);

        if (!rpcError && insertedOrderId) {
            return { orderId: insertedOrderId, orderNumber };
        }

        // ====== 2. FALLBACK SEQUENCIAL (Caso a DB rejeite por desatualização (PGRST202) ou outro erro leve) ======
        console.warn("RPC Transacional falhou ou não existe. Iniciando Fallback Sequencial.", rpcError);

        const newOrderData: any = {
            restaurant_id: finalRestId,
            table_number: tableNumber,
            subtotal,
            tip,
            total_amount: subtotal + tip + (deliveryFee || 0),
            status: "new",
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            order_type: orderType,
            order_number: orderNumber
        };

        if (customerName) newOrderData.customer_name = customerName;
        if (customerPhone) newOrderData.customer_phone = customerPhone;
        if (customerNif) newOrderData.customer_nif = customerNif;
        if (deliveryAddress) newOrderData.delivery_address = deliveryAddress;
        if (deliveryFee !== undefined && deliveryFee > 0) newOrderData.delivery_fee = deliveryFee;

        const { data: insertedOrder, error: orderErr } = await supabase.from('orders').insert([newOrderData]).select('id').single();
        if (orderErr || !insertedOrder) {
            console.error("Failed to place order header", orderErr);
            throw orderErr || new Error("Failed to place order");
        }

        const orderItemsData = items.map(item => ({
            order_id: insertedOrder.id,
            menu_item_id: item.id.includes('-') ? item.id : null,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));

        const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsData);
        if (itemsErr) {
            console.error("Failed to place order items", itemsErr);
            throw itemsErr;
        }

        if (customerPhone) {
            try {
                await supabase.rpc('increment_loyalty_stars', {
                    p_restaurant_id: finalRestId,
                    p_phone_number: customerPhone,
                    p_name: customerName || '',
                    p_stars_to_add: 1
                });
            } catch (err) {
                console.error("Failed to add loyalty points", err);
            }
        }

        return { orderId: insertedOrder.id, orderNumber };
    };

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        // Optimistic UI Update for instant feedback on KDS and Waiter panels
        setOrders(prev => prev.map(o => {
            if (o.id === orderId) {
                const newDeliveredItemIds = newStatus === "delivered" ? o.items.map(i => i.id) : o.deliveredItemIds;
                return { ...o, status: newStatus, deliveredItemIds: newDeliveredItemIds };
            }
            return o;
        }));

        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        
        if (newStatus === "delivered") {
            await supabase.from('order_items').update({ delivered: true }).eq('order_id', orderId);
        }
    };

    const updatePaymentStatus = async (orderId: string, newStatus: PaymentStatus) => {
        // Optimistic update for instant Waiter UI feedback
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
        await supabase.from('orders').update({ payment_status: newStatus }).eq('id', orderId);
    };

    const markItemDelivered = async (orderId: string, itemId: string) => {
        let shouldMarkOrderDelivered = false;

        setOrders(prev => {
            return prev.map(o => {
                if (o.id === orderId) {
                    const deliveredSet = new Set(o.deliveredItemIds);
                    deliveredSet.add(itemId);
                    const allDelivered = o.items.every(i => deliveredSet.has(i.id));
                    if (allDelivered && o.status !== "delivered") {
                        shouldMarkOrderDelivered = true;
                    }
                    return { ...o, deliveredItemIds: Array.from(deliveredSet), status: allDelivered ? "delivered" : o.status };
                }
                return o;
            });
        });

        await supabase.from('order_items').update({ delivered: true }).eq('id', itemId);

        if (shouldMarkOrderDelivered) {
            await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
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
