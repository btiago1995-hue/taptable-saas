"use client";

import { CheckCircle2, Clock, MapPin, Receipt, Package, Truck, Store, PhoneCall, AlertCircle, Play, Check } from "lucide-react";
import { useOrders, LiveOrder, OrderStatus } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo } from "react";

export default function DeliveryManagerDashboard() {
    const { orders: activeOrders, updateOrderStatus } = useOrders();
    const { user } = useAuth();
    const [filter, setFilter] = useState<"all" | "delivery" | "pickup">("all");

    // Only get delivery and pickup orders
    const expressOrders = useMemo(() => {
        const filtered = activeOrders.filter((o: LiveOrder) => o.orderType === "delivery" || o.orderType === "pickup");

        if (filter === "delivery") return filtered.filter(o => o.orderType === "delivery").reverse();
        if (filter === "pickup") return filtered.filter(o => o.orderType === "pickup").reverse();

        return filtered.reverse();
    }, [activeOrders, filter]);

    const handleDispatch = (orderId: string) => {
        updateOrderStatus(orderId, "delivered");
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Gestão de Entregas 🛵</h1>
                    <p className="text-slate-500 font-medium tracking-wide flex items-center gap-2">Monitore pedidos Express (Delivery e Pickup).</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    {[
                        { id: "all", label: "Todos Express", icon: <Package className="w-4 h-4" /> },
                        { id: "delivery", label: "Delivery", icon: <Truck className="w-4 h-4" /> },
                        { id: "pickup", label: "Pickup", icon: <Store className="w-4 h-4" /> }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${filter === f.id ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {expressOrders.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                        <Package className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum Pedido Express</h3>
                    <p className="text-slate-500 max-w-sm">Os pedidos de Delivery e Retirada no balcão aparecerão aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {expressOrders.map(order => {
                        const date = new Date(order.createdAt);
                        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        const isDelivery = order.orderType === "delivery";
                        const isReady = order.status === "ready";
                        const isDelivered = order.status === "delivered";

                        return (
                            <div key={order.id} className={cn(
                                "bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all border-l-4",
                                isDelivery ? "border-l-blue-500 border-y-slate-200 border-r-slate-200" : "border-l-purple-500 border-y-slate-200 border-r-slate-200",
                                isReady && "ring-2 ring-blue-100 shadow-md",
                                isDelivered && "opacity-60"
                            )}>
                                <div className="p-5 flex-1 relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-2xl shadow-sm",
                                                isDelivery ? "bg-blue-500" : "bg-purple-500"
                                            )}>
                                                {isDelivery ? <Truck className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{order.customerName || "Cliente"}</p>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-500">{timeString}</span>
                                                    <span className="text-xs text-slate-300">•</span>
                                                    <span className="text-xs font-bold text-slate-400">ID: {order.id.split('_')[2]}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {order.customerPhone && (
                                        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <PhoneCall className="w-4 h-4 text-primary-500" />
                                            {order.customerPhone}
                                        </div>
                                    )}

                                    {isDelivery && order.deliveryAddress && (
                                        <div className="mb-4 flex items-start gap-2 text-sm font-medium text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <span className="leading-tight">{order.deliveryAddress}</span>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Itens ({order.items.length})</div>
                                        {order.items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-slate-700">
                                                    <span className="text-slate-400 mr-2">{item.quantity}x</span>
                                                    {item.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 border-t border-slate-100 flex flex-col gap-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Total + {isDelivery ? 'Taxa' : 'Gorjeta'}</span>
                                            <span className="font-bold text-slate-900 text-lg">
                                                {formatCurrency(order.totalAmount + (order.deliveryFee || 0))}
                                            </span>
                                        </div>
                                        {order.paymentStatus === "pending" ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1 mb-1">
                                                    <AlertCircle className="w-3 h-3" /> Pendente
                                                </span>
                                                <span className="text-xs font-medium text-amber-700">Cobrar no Local</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1 mb-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Pago Online
                                                </span>
                                                <span className="text-xs font-medium text-emerald-700">Liberado</span>
                                            </div>
                                        )}
                                    </div>

                                    {!isDelivered && (
                                        <button
                                            onClick={() => handleDispatch(order.id)}
                                            disabled={!isReady}
                                            className={cn(
                                                "w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm",
                                                isReady
                                                    ? (isDelivery ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-[0.98]" : "bg-purple-600 hover:bg-purple-700 text-white shadow-md active:scale-[0.98]")
                                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                            )}
                                        >
                                            {isReady ? (
                                                <>
                                                    <Play className="w-4 h-4" fill="currentColor" />
                                                    {isDelivery ? "Despachar Entregador" : "Entregar ao Cliente"}
                                                </>
                                            ) : (
                                                <>Aguardando Cozinha...</>
                                            )}
                                        </button>
                                    )}

                                    {isDelivered && (
                                        <div className="w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 bg-slate-100 text-slate-500">
                                            <Check className="w-4 h-4" /> Finalizado
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
