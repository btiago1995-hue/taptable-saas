"use client";

import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { AlertCircle, CheckCircle2, ChefHat, Clock, UtensilsCrossed, MonitorPlay, Play, Truck, Store, Volume2, VolumeX, Printer } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState, useEffect, useRef } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { openWaybillWindow } from "@/lib/ReceiptWaybill";
import { triggerOrderNotification } from "@/lib/notifications";

export default function KitchenDashboard() {
    const { orders: activeOrders, updateOrderStatus, placeOrder } = useOrders();
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMuted, setIsMuted] = useState(false);
    
    // Track previous order count to detect new arrivals
    const prevNewCount = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio object once
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('/bell.ogg');
            audioRef.current.volume = 0.8;
        }
    }, []);

    // Group orders into columns
    const columns = useMemo(() => {
        const newOrders = activeOrders.filter(o => o.status === "new");
        const preparingOrders = activeOrders.filter(o => o.status === "preparing");
        const readyOrders = activeOrders.filter(o => o.status === "ready" || o.status === "delivered").slice(-10); // Show last 10 done/delivered

        return {
            new: [...newOrders].reverse(),
            preparing: [...preparingOrders].reverse(),
            history: [...readyOrders].reverse()
        };
    }, [activeOrders]);

    // Ring bell if new orders arrive
    useEffect(() => {
        const currentNewCount = columns.new.length;
        if (currentNewCount > prevNewCount.current && !isMuted && audioRef.current) {
            // Play sound only if the number of new orders increased
            audioRef.current.play().catch(e => console.log("Audio autoplay prevented by browser", e));
        }
        prevNewCount.current = currentNewCount;
    }, [columns.new.length, isMuted]);

    const handleAction = (orderId: string, currentStatus: string) => {
        if (currentStatus === "new") {
            updateOrderStatus(orderId, "preparing");
            // Notify client that their order is being prepared
            triggerOrderNotification(orderId, "preparing");
        }
        if (currentStatus === "preparing") {
            updateOrderStatus(orderId, "ready");
            // Notify client that their order is ready
            triggerOrderNotification(orderId, "ready");
        }
    };



    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <ChefHat className="w-8 h-8 text-primary-600" />
                        KDS - {user?.name || "Equipe Cozinha"}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 ml-11">Kitchen Display System (Em tempo real)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors border flex items-center gap-2 ${
                            isMuted ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200" : "bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                        }`}
                        title={isMuted ? "Ativar Som" : "Silenciar"}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <div className="flex bg-amber-50 rounded-xl shadow-sm border border-amber-200 px-4 py-2 items-center gap-2 text-amber-800">
                        <ChefHat className="w-5 h-5" />
                        <span className="font-bold">{columns.new.length + columns.preparing.length} Pedidos Ativos</span>
                    </div>
                </div>
            </div>

            {/* Kanban Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pb-4">

                {/* Column 1: Novos */}
                <div className="bg-slate-100 rounded-2xl flex flex-col border border-slate-200 overflow-hidden">
                    <div className="bg-red-50 border-b border-red-100 p-4 border-t-4 border-t-red-500 flex justify-between items-center">
                        <h2 className="font-bold text-red-900 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            A Receber
                        </h2>
                        <span className="bg-white text-red-600 font-bold px-2 py-1 rounded-md text-xs shadow-sm">
                            {columns.new.length}
                        </span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {columns.new.length === 0 && <p className="text-center text-slate-400 py-8 text-sm font-medium">Nenhum pedido novo.</p>}
                        {columns.new.map(order => (
                            <OrderCard key={order.id} order={order} bg="bg-white" onAction={() => handleAction(order.id, "new")} btnLabel="Aceitar e Preparar" btnColor="bg-amber-500 hover:bg-amber-600 text-white" />
                        ))}
                    </div>
                </div>

                {/* Column 2: Em Preparo */}
                <div className="bg-slate-100 rounded-2xl flex flex-col border border-slate-200 overflow-hidden">
                    <div className="bg-amber-50 border-b border-amber-100 p-4 border-t-4 border-t-amber-500 flex justify-between items-center">
                        <h2 className="font-bold text-amber-900 flex items-center gap-2">
                            <ChefHat className="w-5 h-5" />
                            Em Preparo
                        </h2>
                        <span className="bg-white text-amber-600 font-bold px-2 py-1 rounded-md text-xs shadow-sm">
                            {columns.preparing.length}
                        </span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {columns.preparing.length === 0 && <p className="text-center text-slate-400 py-8 text-sm font-medium">Cozinha livre.</p>}
                        {columns.preparing.map(order => (
                            <OrderCard 
                                key={order.id} 
                                order={order} 
                                bg="bg-amber-50/50 border-amber-200" 
                                onAction={() => handleAction(order.id, "preparing")} 
                                btnLabel={order.orderType === "delivery" || order.orderType === "pickup" ? "Pronto para Entrega" : "Pronto p/ Servir"} 
                                btnColor="bg-emerald-600 hover:bg-emerald-700 text-white" 
                                onPrintWaybill={
                                    order.orderType === 'delivery' 
                                    ? () => openWaybillWindow({
                                        order, 
                                        restaurantName: user?.restaurantData?.name || "Restaurante Parceiro",
                                        restaurantNif: user?.restaurantData?.nif || "000000000",
                                        restaurantAddress: user?.restaurantData?.address || ""
                                    })
                                    : undefined
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* Column 3: Histórico */}
                <div className="bg-slate-100 rounded-2xl flex flex-col border border-slate-200 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                    <div className="bg-slate-200 border-b border-slate-300 p-4 border-t-4 border-t-slate-400 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Histórico Recente
                        </h2>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {columns.history.length === 0 && <p className="text-center text-slate-400 py-8 text-sm font-medium">Vazio.</p>}
                        {columns.history.map(order => (
                            <OrderCard key={order.id} order={order} bg="bg-white opacity-60" readOnly />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

// Helper Card Component
function OrderCard({ order, bg, onAction, btnLabel, btnColor, readOnly = false, onPrintWaybill }: any) {
    const timeString = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isDelivery = order.orderType === "delivery";
    const isPickup = order.orderType === "pickup";
    const isInStore = !isDelivery && !isPickup;

    const shortId = order.orderNumber || order.id.split('_')[2] || "000";

    return (
        <div className={cn(
            "rounded-xl shadow-sm border p-4 flex flex-col transition-shadow hover:shadow-sm",
            bg || 'border-slate-200 bg-white',
            isDelivery ? "border-l-4 border-l-blue-500" : isPickup ? "border-l-4 border-l-purple-500" : ""
        )}>
            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold shadow-sm",
                        isDelivery ? "bg-blue-500" : isPickup ? "bg-purple-500" : "bg-slate-900"
                    )}>
                        {isInStore ? order.tableNumber : shortId}
                    </div>
                    <div>
                        {isInStore ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Store className="w-3 h-3" /> Salão
                            </p>
                        ) : isDelivery ? (
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Delivery
                            </p>
                        ) : (
                            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                                <Store className="w-3 h-3" /> Pickup
                            </p>
                        )}
                        <div className="flex items-center gap-1 opacity-80 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className="text-xs font-semibold text-slate-600">{timeString}</span>
                        </div>
                    </div>
                </div>
                {readOnly && (
                    <span className="text-[10px] font-bold py-1 px-2 rounded-full bg-slate-200 text-slate-600">
                        {order.status === 'ready' ? 'Pronto' : 'Entregue'}
                    </span>
                )}
            </div>

            <div className="space-y-2 mb-4 flex-1">
                {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-2 text-sm">
                        <span className="font-bold text-slate-400">{item.quantity}x</span>
                        <span className="font-medium text-slate-800 leading-tight">{item.name}</span>
                    </div>
                ))}
            </div>

            {!readOnly && (
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onAction}
                        className={`w-full py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-colors shadow-sm ${btnColor}`}
                    >
                        <Play className="w-4 h-4" fill="currentColor" /> {btnLabel}
                    </button>
                    {onPrintWaybill && (
                        <button
                            onClick={onPrintWaybill}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex justify-center items-center gap-2 transition-colors border border-slate-200"
                        >
                            <Printer className="w-3 h-3" /> Imprimir Guia de Transporte
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
