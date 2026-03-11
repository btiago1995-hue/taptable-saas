"use client";

import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Clock, MapPin, PhoneCall, Navigation, ArrowRight, User } from "lucide-react";

export default function DriverDashboard() {
    const { orders: activeOrders, updateOrderStatus } = useOrders();
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    const deliveries = useMemo(() => {
        return activeOrders
            .filter((o: LiveOrder) => o.orderType === "delivery" && o.status === "ready")
            .reverse();
    }, [activeOrders]);

    const activeDelivery = deliveries[0];
    const nextDeliveries = deliveries.slice(1);

    const handleConfirmDelivery = (orderId: string) => {
        setConfirmingId(orderId);
        setTimeout(() => {
            updateOrderStatus(orderId, "delivered");
            setConfirmingId(null);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-hidden flex flex-col">

            {/* Map Background Simulation */}
            <div className="absolute inset-0 z-0">
                {/* Dark Map Texture */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity grayscale" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900" />

                {activeDelivery && (
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg mb-2 z-10 animate-bounce">
                            Destino
                        </div>
                        <div className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-0" />
                    </div>
                )}
            </div>

            {/* Header - Uber Eats Style */}
            <header className="relative z-10 p-5 flex justify-between items-start mt-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-slate-200">
                    <User className="w-6 h-6 text-slate-800" />
                </div>

                <div className="bg-slate-900 rounded-full px-5 py-2 flex flex-col items-center justify-center shadow-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Ganhos Hoje</div>
                    <div className="font-black text-xl text-white">R$ 145,50</div>
                </div>
            </header>

            {/* Floating Top Warning if empty */}
            {!activeDelivery && (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-24 h-24 rounded-full bg-slate-800/80 backdrop-blur-xl flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
                        <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">Procurando...</h2>
                    <p className="text-slate-400 text-center font-medium">Você está online. Vá para áreas de alta demanda.</p>
                </div>
            )}

            {/* Bottom Sheet for Active Delivery */}
            {activeDelivery && (
                <div className="relative z-20 mt-auto bg-slate-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] rounded-t-[2.5rem] border-t border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
                    {/* Handle */}
                    <div className="w-full flex justify-center pt-4 pb-2 shrink-0">
                        <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
                    </div>

                    <div className="px-6 pb-6 overflow-y-auto overflow-x-hidden flex-1 no-scrollbar">

                        {/* Dropoff Header */}
                        <div className="flex justify-between items-center mb-6 mt-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Entrega Solicitada</div>
                                <h2 className="text-4xl font-black text-white tracking-tighter">7 min</h2>
                                <p className="text-slate-300 font-medium text-lg mt-1">1.2 km de distância</p>
                            </div>
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                                <Navigation className="w-6 h-6 text-white mb-1" />
                            </div>
                        </div>

                        {/* Customer Info Card Uber Style */}
                        <div className="bg-slate-800 border-l-4 border-l-blue-500 rounded-r-2xl p-5 mb-4 shadow-md">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-white mb-2">{activeDelivery.customerName}</h3>

                                    {activeDelivery.paymentStatus === "paid" ? (
                                        <span className="inline-flex items-center gap-1 bg-slate-900 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase">
                                            Pago via App
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase border border-rose-500/30">
                                            Cobrar {formatCurrency(activeDelivery.totalAmount + (activeDelivery.deliveryFee || 0))}
                                        </span>
                                    )}
                                </div>
                                {activeDelivery.customerPhone && (
                                    <a href={`tel:${activeDelivery.customerPhone}`} className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-white active:bg-slate-600 transition-colors shrink-0 shadow-sm ml-4">
                                        <PhoneCall className="w-5 h-5" />
                                    </a>
                                )}
                            </div>

                            <div className="flex items-start gap-3 mt-4 pt-4 border-t border-slate-700">
                                <MapPin className="w-6 h-6 text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-base font-medium text-slate-100 leading-snug">
                                        {activeDelivery.deliveryAddress}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">Tocar interfone e aguardar.</p>
                                </div>
                            </div>
                        </div>

                        {/* Order Details */}
                        <div className="bg-slate-800/50 rounded-2xl p-5 mb-2">
                            <div className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3 flex items-center justify-between">
                                <span>Pedido #{activeDelivery.id.split('_')[2]}</span>
                                <span>{activeDelivery.items.length} itens</span>
                            </div>
                            <div className="space-y-3">
                                {activeDelivery.items.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 text-base">
                                        <span className="font-bold text-slate-300 bg-slate-700 w-6 h-6 flex items-center justify-center rounded">{item.quantity}</span>
                                        <span className="text-slate-200 font-medium truncate">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Action Button Area - Uber Swipe Style Simulation */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0 pb-10">
                        <button
                            onClick={() => handleConfirmDelivery(activeDelivery.id)}
                            disabled={confirmingId === activeDelivery.id}
                            className={cn(
                                "relative w-full h-[72px] rounded-full overflow-hidden group transition-all duration-300",
                                confirmingId === activeDelivery.id ? "bg-emerald-500" : "bg-blue-600 active:scale-[0.98] shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            )}
                        >
                            {confirmingId === activeDelivery.id ? (
                                <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-white tracking-widest uppercase">
                                    Finalizado
                                </div>
                            ) : (
                                <>
                                    <div className="absolute inset-y-2 left-2 bg-white/20 backdrop-blur-sm rounded-full w-14 flex items-center justify-center transition-all duration-500 group-active:w-[calc(100%-16px)] z-10">
                                        <ArrowRight className="w-6 h-6 text-white group-active:translate-x-full transition-transform duration-500" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white pl-8 z-0 tracking-widest uppercase">
                                        Concluir Entrega
                                    </div>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
