"use client";

import { CheckCircle2, Clock, MapPin, Package, Truck, Store, PhoneCall, AlertCircle, Navigation, Check, ChevronDown, UserCheck, Loader2 } from "lucide-react";
import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";

interface Driver { id: string; name: string; }

export default function DeliveryManagerDashboard() {
    const { orders: activeOrders, assignOrder } = useOrders();
    const { user } = useAuth();
    const [filter, setFilter] = useState<"all" | "delivery" | "pickup">("all");
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({}); // orderId → driverId
    const [dispatching, setDispatching] = useState<string | null>(null);

    // Fetch drivers for this restaurant
    useEffect(() => {
        if (!user?.restaurantId) return;
        fetch(`/api/drivers?restaurantId=${user.restaurantId}`)
            .then(r => r.json())
            .then(d => setDrivers(d.drivers || []))
            .catch(() => {});
    }, [user?.restaurantId]);

    const expressOrders = useMemo(() => {
        const filtered = activeOrders.filter((o: LiveOrder) => o.orderType === "delivery" || o.orderType === "pickup");
        if (filter === "delivery") return filtered.filter(o => o.orderType === "delivery").reverse();
        if (filter === "pickup") return filtered.filter(o => o.orderType === "pickup").reverse();
        return filtered.reverse();
    }, [activeOrders, filter]);

    const activeCount = expressOrders.filter(o => o.status !== "delivered").length;

    const handleDispatch = async (order: LiveOrder) => {
        if (order.orderType === "pickup") {
            // Pickup: just mark as delivered directly
            setDispatching(order.id);
            await fetch("/api/orders/assign-driver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, driverId: "pickup", driverName: "Retirada no Balcão" }),
            }).catch(() => {});
            setDispatching(null);
            return;
        }

        const driverId = selectedDriver[order.id];
        if (!driverId) return;
        const driver = drivers.find(d => d.id === driverId);
        if (!driver) return;

        setDispatching(order.id);
        try {
            await assignOrder(order.id, driver.id, driver.name);
            await fetch("/api/orders/assign-driver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, driverId: driver.id, driverName: driver.name }),
            });
        } catch (err) {
            console.error("[dispatch] Error:", err);
        } finally {
            setDispatching(null);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-3">
                        <Truck className="w-8 h-8 text-blue-600" />
                        Gestão de Entregas
                    </h1>
                    <p className="text-slate-500 font-medium ml-11">
                        {activeCount > 0 ? (
                            <span className="text-blue-700 font-semibold">{activeCount} pedido{activeCount !== 1 ? "s" : ""} ativo{activeCount !== 1 ? "s" : ""}</span>
                        ) : "Nenhum pedido ativo no momento."}
                    </p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    {[
                        { id: "all", label: "Todos", icon: <Package className="w-4 h-4" /> },
                        { id: "delivery", label: "Delivery", icon: <Truck className="w-4 h-4" /> },
                        { id: "pickup", label: "Pickup", icon: <Store className="w-4 h-4" /> }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                                filter === f.id ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {f.icon}
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {expressOrders.length === 0 ? (
                <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum Pedido Express</h3>
                    <p className="text-slate-400 max-w-sm">Os pedidos de Delivery e Pickup aparecerão aqui em tempo real.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {expressOrders.map(order => {
                        const timeString = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isDelivery = order.orderType === "delivery";
                        const isReady = order.status === "ready";
                        const isDelivering = order.status === "delivering";
                        const isDelivered = order.status === "delivered";
                        const isPreparing = order.status === "preparing" || order.status === "new";
                        const chosenDriverId = selectedDriver[order.id] || "";
                        const isDispatching = dispatching === order.id;

                        return (
                            <div key={order.id} className={cn(
                                "bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all duration-300",
                                isDelivery ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-purple-500",
                                isReady && "ring-2 ring-blue-200 shadow-md",
                                isDelivering && "ring-2 ring-emerald-200 shadow-md",
                                isDelivered && "opacity-55 grayscale-[30%]"
                            )}>
                                {/* Card Header */}
                                <div className="p-5 pb-3">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-sm",
                                                isDelivery ? "bg-blue-500" : "bg-purple-500"
                                            )}>
                                                {isDelivery ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{order.customerName || "Cliente"}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="text-xs text-slate-500 font-medium">{timeString}</span>
                                                    <span className="text-xs text-slate-300">•</span>
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                                                        isPreparing ? "bg-amber-100 text-amber-700" :
                                                        isReady ? "bg-blue-100 text-blue-700" :
                                                        isDelivering ? "bg-emerald-100 text-emerald-700" :
                                                        "bg-slate-100 text-slate-500"
                                                    )}>
                                                        {isPreparing ? "Preparando" : isReady ? "Pronto" : isDelivering ? "A caminho" : "Entregue"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-bold text-slate-900">{formatCurrency(order.totalAmount + (order.deliveryFee || 0))}</div>
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {order.paymentStatus === "paid" ? "Pago" : "Pagar na entrega"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    {order.customerPhone && (
                                        <a href={`tel:${order.customerPhone}`} className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors w-fit">
                                            <PhoneCall className="w-3.5 h-3.5 text-primary-500" />
                                            {order.customerPhone}
                                        </a>
                                    )}

                                    {/* Address */}
                                    {isDelivery && order.deliveryAddress && (
                                        <div className="mb-3 flex items-start gap-2 text-xs font-medium text-slate-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                                <span className="leading-tight block">{order.deliveryAddress}</span>
                                                <a
                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 font-bold flex items-center gap-1 mt-1 hover:text-blue-800"
                                                >
                                                    <Navigation className="w-3 h-3" /> Abrir no Maps
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div className="space-y-1 mb-1">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</div>
                                        {order.items.slice(0, 3).map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span className="font-bold text-slate-400 bg-slate-100 w-5 h-5 rounded flex items-center justify-center text-[10px]">{item.quantity}</span>
                                                <span className="font-medium text-slate-700 truncate">{item.name}</span>
                                            </div>
                                        ))}
                                        {order.items.length > 3 && (
                                            <div className="text-[10px] text-slate-400 pl-7">+{order.items.length - 3} mais...</div>
                                        )}
                                    </div>
                                </div>

                                {/* Driver assignment shown if already assigned */}
                                {order.assignedDriverName && !isDelivered && (
                                    <div className="mx-5 mb-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-800">
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        Entregador: <span className="font-bold">{order.assignedDriverName}</span>
                                    </div>
                                )}

                                {/* Footer / Action */}
                                <div className="bg-slate-50 border-t border-slate-100 p-4 mt-auto">
                                    {isDelivered ? (
                                        <div className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-500">
                                            <Check className="w-4 h-4 text-emerald-500" /> Finalizado
                                        </div>
                                    ) : isDelivering ? (
                                        <div className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 border border-emerald-200">
                                            <Truck className="w-4 h-4" /> Em Rota de Entrega
                                        </div>
                                    ) : isReady ? (
                                        isDelivery ? (
                                            <div className="flex flex-col gap-2">
                                                {drivers.length > 0 ? (
                                                    <div className="relative">
                                                        <select
                                                            value={chosenDriverId}
                                                            onChange={e => setSelectedDriver(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                            className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                        >
                                                            <option value="">Selecionar entregador...</option>
                                                            {drivers.map(d => (
                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-400 text-center py-1">Nenhum entregador cadastrado.</p>
                                                )}
                                                <button
                                                    onClick={() => handleDispatch(order)}
                                                    disabled={!chosenDriverId || isDispatching}
                                                    className={cn(
                                                        "w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm",
                                                        chosenDriverId && !isDispatching
                                                            ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]"
                                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isDispatching ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Despachando...</>
                                                    ) : (
                                                        <><Truck className="w-4 h-4" /> Despachar Entregador</>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleDispatch(order)}
                                                disabled={isDispatching}
                                                className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98] transition-all shadow-sm"
                                            >
                                                {isDispatching ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                                                ) : (
                                                    <><Store className="w-4 h-4" /> Entregar ao Cliente</>
                                                )}
                                            </button>
                                        )
                                    ) : (
                                        <div className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-amber-50 text-amber-600 border border-amber-200">
                                            <AlertCircle className="w-3.5 h-3.5" /> Aguardando a Cozinha...
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
