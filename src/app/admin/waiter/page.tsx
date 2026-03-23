"use client";

import { CheckCircle2, Clock, MapPin, Receipt, Utensils, UtensilsCrossed, AlertCircle, RefreshCcw, Users, Check, Coffee, Play, Banknote } from "lucide-react";
import { useOrders, LiveOrder, OrderStatus, PaymentStatus } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { WaiterPOS } from "@/components/admin/WaiterPOS";

export default function WaiterDashboard() {
    const { orders: activeOrders, updateOrderStatus, updatePaymentStatus, markItemDelivered } = useOrders();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    // Waiters only care about ready orders (to deliver) and delivered (history)
    // We might also show "preparing" just so they know the kitchen is working on it.
    const [filter, setFilter] = useState<"pending" | "delivered">("pending");

    const displayOrders = useMemo(() => {
        // Waiter only handles in-store (salão) orders.
        // Delivery/pickup are managed in the Delivery page (/admin/delivery).
        const inStore = activeOrders.filter((o: LiveOrder) => o.orderType !== "delivery" && o.orderType !== "pickup");
        if (filter === "pending") {
            return [...inStore.filter((o: LiveOrder) => o.status === "new" || o.status === "preparing" || o.status === "ready")].reverse();
        } else {
            return [...inStore.filter((o: LiveOrder) => o.status === "delivered")].reverse();
        }
    }, [activeOrders, filter]);

    const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case "new": return { label: "Cozinha vai aceitar", color: "bg-red-50 text-red-600 border border-red-200" };
            case "preparing": return { label: "Na Cozinha", color: "bg-amber-100 text-amber-800" };
            case "ready": return { label: "Pronto p/ Levar", color: "bg-blue-100 text-blue-800 font-bold border-2 border-blue-400 animate-pulse" };
            case "delivering": return { label: "A Caminho", color: "bg-teal-100 text-teal-800 font-bold" };
            case "delivered": return { label: "Entregue", color: "bg-emerald-100 text-emerald-800" };
        }
    };

    const handleDeliver = (orderId: string) => {
        updateOrderStatus(orderId, "delivered");
    };

    const handleConfirmPayment = (orderId: string) => {
        if (confirm("Confirmar recebimento em dinheiro para esta mesa?")) {
            updatePaymentStatus(orderId, "paid");
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Olá, {user?.name?.split(" ")[0] || "Garçom"} 👋</h1>
                    <p className="hidden md:flex text-slate-500 font-medium tracking-wide items-center gap-2">Supervisione as mesas e entregue pratos prontos.</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    {[
                        { id: "pending", label: "Mesas Ativas" },
                        { id: "delivered", label: "Histórico Entregue" }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`flex-1 md:flex-none px-4 py-3 md:py-2 rounded-lg text-sm md:text-sm font-bold md:font-semibold transition-colors ${filter === f.id ? "bg-primary-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {displayOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum pedido no salão</h3>
                    <p className="text-slate-500 max-w-sm">Quando a cozinha marcar algum pedido como pronto, avise sua equipe e leve até a mesa.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayOrders.map(order => {
                        const statusInfo = getStatusText(order.status);
                        const date = new Date(order.createdAt);
                        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={order.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all hover:shadow-md ${order.status === 'ready' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-12 rounded-xl text-white flex items-center justify-center font-bold text-xl shadow-sm transform -rotate-2 px-3",
                                                order.tableNumber > 0 ? "bg-slate-900 min-w-[3rem]" : "bg-purple-600 min-w-[4rem]"
                                            )}>
                                                {order.tableNumber > 0 ? order.tableNumber : (order.orderNumber || `#${order.id.split('_')[2] || "00"}`)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    {order.tableNumber > 0 ? "Mesa" : "Pedido"}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="text-sm font-semibold text-slate-700">{timeString}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-4 mt-6">
                                        {order.items.map((item: any, idx: number) => {
                                            const isDelivered = (order.deliveredItemIds || []).includes(item.id);
                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => !isDelivered && markItemDelivered(order.id, item.id)}
                                                    className={cn(
                                                        "flex justify-between items-center text-sm p-3 rounded-xl border transition-all mb-2 select-none",
                                                        isDelivered
                                                            ? "bg-slate-50 border-transparent opacity-60"
                                                            : "bg-white border-slate-100 hover:border-blue-200 cursor-pointer hover:bg-blue-50/50 shadow-sm min-h-[64px]"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "font-semibold flex items-center gap-3 text-base md:text-sm",
                                                        isDelivered ? "text-slate-500 line-through" : "text-slate-800"
                                                    )}>
                                                        <span className={isDelivered ? "text-slate-400 font-normal" : "text-blue-600 font-extrabold text-lg"}>
                                                            {item.quantity}x
                                                        </span>
                                                        {item.name}
                                                    </span>
                                                    {!isDelivered ? (
                                                        <button
                                                            className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 active:scale-95"
                                                        >
                                                            <Coffee className="w-4 h-4" /> Servir
                                                        </button>
                                                    ) : (
                                                        <Check className="w-5 h-5 text-emerald-500" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                </div>
                                <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">
                                                {formatCurrency(order.totalAmount)}
                                            </span>
                                            {order.paymentStatus === "pending" ? (
                                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> Pagar no Balcão
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> Pago
                                                </span>
                                            )}
                                        </div>

                                        {order.status === "ready" && (
                                            <button
                                                onClick={() => handleDeliver(order.id)}
                                                className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-transform transform active:scale-95 shadow-md"
                                            >
                                                <Play className="w-4 h-4" fill="currentColor" /> Servir a Mesa
                                            </button>
                                        )}
                                        {(order.status === "new" || order.status === "preparing") && (
                                            <span className="text-slate-400 text-xs font-semibold">
                                                Aguardando Cozinha...
                                            </span>
                                        )}
                                        {order.status === "delivered" && (
                                            <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                                                <Check className="w-4 h-4" /> Finalizado
                                            </span>
                                        )}
                                    </div>

                                    {order.paymentStatus === "pending" && (
                                        <div className="mt-2 text-center w-full">
                                            <button
                                                onClick={() => handleConfirmPayment(order.id)}
                                                className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                                            >
                                                <Banknote className="w-5 h-5" /> Confirmar Pagamento (Dinheiro)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Render the Mini-POS Widget */}
            {user?.restaurantId && (
                <WaiterPOS restaurantId={user.restaurantId} />
            )}
        </div>
    );
}
