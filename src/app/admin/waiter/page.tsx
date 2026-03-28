"use client";

import { AlertCircle, Check, Coffee, Clock, Users, Play, Banknote, Truck, Store, PhoneCall, MapPin, Navigation, ChevronDown, UserCheck, Loader2, Package } from "lucide-react";
import { showConfirm } from "@/lib/toast";
import { useOrders, LiveOrder, OrderStatus } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { WaiterPOS } from "@/components/admin/WaiterPOS";

interface Driver { id: string; name: string; }

export default function WaiterDashboard() {
    const { orders: activeOrders, updateOrderStatus, updatePaymentStatus, markItemDelivered, assignOrder } = useOrders();
    const { user } = useAuth();
    const [filter, setFilter] = useState<"pending" | "delivered" | "delivery">("pending");

    // ── Delivery tab state ──
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
    const [dispatching, setDispatching] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.restaurantId) return;
        fetch(`/api/drivers?restaurantId=${user.restaurantId}`)
            .then(r => r.json())
            .then(d => setDrivers(d.drivers || []))
            .catch(() => {});
    }, [user?.restaurantId]);

    // ── In-store orders ──
    const displayOrders = useMemo(() => {
        const inStore = activeOrders.filter((o: LiveOrder) => o.orderType !== "delivery" && o.orderType !== "pickup");
        if (filter === "pending")
            return [...inStore.filter(o => o.status === "new" || o.status === "preparing" || o.status === "ready")].reverse();
        if (filter === "delivered")
            return [...inStore.filter(o => o.status === "delivered")].reverse();
        return [];
    }, [activeOrders, filter]);

    // ── Delivery/pickup orders ──
    const deliveryOrders = useMemo(() => {
        return [...activeOrders.filter((o: LiveOrder) => o.orderType === "delivery" || o.orderType === "pickup")].reverse();
    }, [activeOrders]);

    const deliveryActiveCount = deliveryOrders.filter(o => o.status !== "delivered").length;

    const getStatusText = (status: OrderStatus) => {
        switch (status) {
            case "new":       return { label: "Cozinha vai aceitar", color: "bg-red-50 text-red-600 border border-red-200" };
            case "preparing": return { label: "Na Cozinha",          color: "bg-amber-100 text-amber-800" };
            case "ready":     return { label: "Pronto p/ Levar",     color: "bg-blue-100 text-blue-800 font-bold border-2 border-blue-400 animate-pulse" };
            case "delivering":return { label: "A Caminho",           color: "bg-teal-100 text-teal-800 font-bold" };
            case "delivered": return { label: "Entregue",            color: "bg-emerald-100 text-emerald-800" };
        }
    };

    const handleDeliver = (orderId: string) => updateOrderStatus(orderId, "delivered");

    const handleConfirmPayment = (orderId: string) => {
        showConfirm("Confirmar recebimento em dinheiro para esta mesa?", () =>
            updatePaymentStatus(orderId, "paid")
        );
    };

    const handleDispatch = async (order: LiveOrder) => {
        if (order.orderType === "pickup") {
            setDispatching(order.id);
            await assignOrder(order.id, "pickup", "Retirada no Balcão");
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
        } finally {
            setDispatching(null);
        }
    };

    const tabs = [
        { id: "pending",  label: "Mesas Ativas" },
        { id: "delivered",label: "Histórico" },
        { id: "delivery", label: "Entregas", badge: deliveryActiveCount > 0 ? deliveryActiveCount : null },
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                        Olá, {user?.name?.split(" ")[0] || "Garçom"} 👋
                    </h1>
                    <p className="hidden md:flex text-slate-500 font-medium tracking-wide items-center gap-2">
                        Supervisione as mesas, entregas e pratos prontos.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 gap-0.5">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setFilter(t.id as any)}
                            className={cn(
                                "relative flex-1 md:flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5",
                                filter === t.id ? "bg-primary-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {t.id === "delivery" && <Truck className="w-3.5 h-3.5" />}
                            {t.label}
                            {t.badge && (
                                <span className={cn(
                                    "text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center",
                                    filter === t.id ? "bg-white text-primary-600" : "bg-blue-600 text-white"
                                )}>
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab: Mesas Ativas + Histórico ── */}
            {filter !== "delivery" && (
                <>
                    {displayOrders.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum pedido no salão</h3>
                            <p className="text-slate-500 max-w-sm">Quando a cozinha marcar algum pedido como pronto, leve até à mesa.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayOrders.map(order => {
                                const statusInfo = getStatusText(order.status);
                                const timeString = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <div key={order.id} className={cn(
                                        "bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all hover:shadow-md",
                                        order.status === "ready" ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
                                    )}>
                                        <div className="p-5 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-12 rounded-xl text-white flex items-center justify-center font-bold text-xl shadow-sm transform -rotate-2 px-3",
                                                        order.tableNumber > 0 ? "bg-slate-900 min-w-[3rem]" : "bg-purple-600 min-w-[4rem]"
                                                    )}>
                                                        {order.tableNumber > 0 ? order.tableNumber : (order.orderNumber || `#${order.id.split("_")[2] || "00"}`)}
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
                                                <div className={cn("px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5", statusInfo.color)}>
                                                    {statusInfo.label}
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4 mt-4">
                                                {order.items.map((item: any, idx: number) => {
                                                    const isDone = (order.deliveredItemIds || []).includes(item.id);
                                                    return (
                                                        <div key={idx}
                                                            onClick={() => !isDone && markItemDelivered(order.id, item.id)}
                                                            className={cn(
                                                                "flex justify-between items-center text-sm p-3 rounded-xl border transition-all select-none",
                                                                isDone ? "bg-slate-50 border-transparent opacity-60" : "bg-white border-slate-100 hover:border-blue-200 cursor-pointer hover:bg-blue-50/50 shadow-sm min-h-[56px]"
                                                            )}
                                                        >
                                                            <span className={cn("font-semibold flex items-center gap-3", isDone ? "text-slate-500 line-through" : "text-slate-800")}>
                                                                <span className={isDone ? "text-slate-400 font-normal" : "text-blue-600 font-extrabold text-lg"}>{item.quantity}x</span>
                                                                {item.name}
                                                            </span>
                                                            {!isDone
                                                                ? <button className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5 active:scale-95"><Coffee className="w-3.5 h-3.5" /> Servir</button>
                                                                : <Check className="w-5 h-5 text-emerald-500" />
                                                            }
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900">{formatCurrency(order.totalAmount)}</span>
                                                    {order.paymentStatus === "pending" ? (
                                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Pagar no Balcão</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1"><Check className="w-3 h-3" /> Pago</span>
                                                    )}
                                                </div>
                                                {order.status === "ready" && (
                                                    <button onClick={() => handleDeliver(order.id)} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-transform active:scale-95 shadow-sm">
                                                        <Play className="w-4 h-4" fill="currentColor" /> Servir a Mesa
                                                    </button>
                                                )}
                                                {(order.status === "new" || order.status === "preparing") && (
                                                    <span className="text-slate-400 text-xs font-semibold">Aguardando Cozinha...</span>
                                                )}
                                                {order.status === "delivered" && (
                                                    <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Finalizado</span>
                                                )}
                                            </div>
                                            {order.paymentStatus === "pending" && order.status !== "delivered" && (
                                                <button onClick={() => handleConfirmPayment(order.id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                                                    <Banknote className="w-4 h-4" /> Confirmar Pagamento (Dinheiro)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── Tab: Gestão de Entregas ── */}
            {filter === "delivery" && (
                <>
                    {deliveryOrders.length === 0 ? (
                        <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Package className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum Pedido Express</h3>
                            <p className="text-slate-400 max-w-sm">Os pedidos de Delivery e Pickup aparecerão aqui em tempo real.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {deliveryOrders.map(order => {
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
                                        "bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col transition-all",
                                        isDelivery ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-purple-500",
                                        isReady && "ring-2 ring-blue-200 shadow-md",
                                        isDelivering && "ring-2 ring-emerald-200",
                                        isDelivered && "opacity-55"
                                    )}>
                                        <div className="p-5 pb-3">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-sm", isDelivery ? "bg-blue-500" : "bg-purple-500")}>
                                                        {isDelivery ? <Truck className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{order.customerName || "Cliente"}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                            <span className="text-xs text-slate-500">{timeString}</span>
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
                                                    <div className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount + (order.deliveryFee || 0))}</div>
                                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                                                        {order.paymentStatus === "paid" ? "Pago" : "Pagar na entrega"}
                                                    </span>
                                                </div>
                                            </div>

                                            {order.customerPhone && (
                                                <a href={`tel:${order.customerPhone}`} className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors w-fit">
                                                    <PhoneCall className="w-3.5 h-3.5 text-primary-500" /> {order.customerPhone}
                                                </a>
                                            )}

                                            {isDelivery && order.deliveryAddress && (
                                                <div className="mb-3 flex items-start gap-2 text-xs text-slate-700 bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                                    <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="block leading-tight">{order.deliveryAddress}</span>
                                                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold flex items-center gap-1 mt-1">
                                                            <Navigation className="w-3 h-3" /> Abrir no Maps
                                                        </a>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</div>
                                                {order.items.slice(0, 3).map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        <span className="font-bold text-slate-400 bg-slate-100 w-5 h-5 rounded flex items-center justify-center text-[10px]">{item.quantity}</span>
                                                        <span className="font-medium text-slate-700 truncate">{item.name}</span>
                                                    </div>
                                                ))}
                                                {order.items.length > 3 && <div className="text-[10px] text-slate-400 pl-7">+{order.items.length - 3} mais...</div>}
                                            </div>
                                        </div>

                                        {order.assignedDriverName && !isDelivered && (
                                            <div className="mx-5 mb-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                Entregador: <span className="font-bold">{order.assignedDriverName}</span>
                                            </div>
                                        )}

                                        <div className="bg-slate-50 border-t border-slate-100 p-4 mt-auto">
                                            {isDelivered ? (
                                                <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-500">
                                                    <Check className="w-4 h-4 text-emerald-500" /> Finalizado
                                                </div>
                                            ) : isDelivering ? (
                                                <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 border border-emerald-200">
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
                                                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                                                                "w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all",
                                                                chosenDriverId && !isDispatching ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                            )}
                                                        >
                                                            {isDispatching ? <><Loader2 className="w-4 h-4 animate-spin" /> Despachando...</> : <><Truck className="w-4 h-4" /> Despachar Entregador</>}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDispatch(order)}
                                                        disabled={isDispatching}
                                                        className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98] transition-all"
                                                    >
                                                        {isDispatching ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</> : <><Store className="w-4 h-4" /> Entregar ao Cliente</>}
                                                    </button>
                                                )
                                            ) : (
                                                <div className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-amber-50 text-amber-600 border border-amber-200">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Aguardando a Cozinha...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Mini-POS */}
            {user?.restaurantId && <WaiterPOS restaurantId={user.restaurantId} />}
        </div>
    );
}
