"use client";

import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Clock, MapPin, PhoneCall, Navigation, ArrowRight, User, Loader2, Store, Power, LogOut, X, Banknote, CheckCircle2, History, ExternalLink, MessageSquare } from "lucide-react";

function SwipeToConfirm({ onConfirm, isConfirming }: { onConfirm: () => void, isConfirming: boolean }) {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [unlocked, setUnlocked] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isConfirming && unlocked) {
            setUnlocked(false);
            setDragX(0);
        }
    }, [isConfirming]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isConfirming || unlocked) return;
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || isConfirming || unlocked || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const maxDrag = rect.width - 72; // thumb width (56px) + padding (16px)
        
        // Calculate new X based on pointer position relative to container
        let newX = e.clientX - rect.left - 36;
        newX = Math.max(0, Math.min(newX, maxDrag));
        
        setDragX(newX);

        if (newX > maxDrag * 0.7) { // 70% threshold is very forgiving for gloves
            setUnlocked(true);
            setIsDragging(false);
            setDragX(maxDrag);
            onConfirm();
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (!unlocked) {
            setDragX(0); // snap back
        }
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "relative w-full h-[72px] rounded-full overflow-hidden transition-all duration-300 touch-none select-none",
                (isConfirming || unlocked) ? "bg-emerald-500" : "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            )}
        >
            {(isConfirming || unlocked) ? (
                <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-white tracking-widest uppercase z-10 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Finalizado
                </div>
            ) : (
                <>
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-white pl-8 z-0 tracking-widest uppercase opacity-80">
                        Concluir Entrega
                    </div>
                    {/* The green filled track that trails behind the thumb */}
                    <div 
                        className="absolute top-2 bottom-2 left-2 bg-emerald-500 rounded-full z-10"
                        style={{ 
                            width: dragX > 0 ? dragX + 56 : 56,
                            transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                    >
                        {/* The Thumb */}
                        <div 
                            className="absolute right-0 top-0 bottom-0 w-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            <ArrowRight className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function DriverDashboard() {
    const { orders: activeOrders, updateOrderStatus } = useOrders();
    const { user, loading: authLoading, logout } = useAuth();
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [distanceInfo, setDistanceInfo] = useState<{ km: string; minutes: number } | null>(null);

    const deliveries = useMemo(() => {
        if (!isOnline) return [];
        return activeOrders
            .filter((o: LiveOrder) => o.orderType === "delivery" && (o.status === "preparing" || o.status === "ready" || o.status === "delivering"))
            .reverse();
    }, [activeOrders, isOnline]);

    // Get driver's GPS position
    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {}, // silently fail
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Haversine distance calculator
    const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Geocode address & compute distance whenever active delivery changes
    useEffect(() => {
        const delivery = deliveries[0];
        if (!delivery || delivery.status !== "delivering" || !delivery.deliveryAddress || !driverCoords) {
            setDistanceInfo(null);
            return;
        }
        const encoded = encodeURIComponent(delivery.deliveryAddress);
        fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`)
            .then(r => r.json())
            .then(results => {
                if (results && results[0]) {
                    const destLat = parseFloat(results[0].lat);
                    const destLng = parseFloat(results[0].lon);
                    const km = haversineKm(driverCoords.lat, driverCoords.lng, destLat, destLng);
                    const minutes = Math.round((km / 25) * 60); // ~25 km/h average city speed
                    setDistanceInfo({ km: km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`, minutes });
                }
            })
            .catch(() => setDistanceInfo(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deliveries[0]?.id, driverCoords]);

    const openGoogleMaps = (address: string) => {
        const encoded = encodeURIComponent(address);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`, '_blank');
    };

    const todayMetrics = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deliveredToday = activeOrders.filter(o => 
            o.orderType === "delivery" && 
            o.status === "delivered" && 
            new Date(o.createdAt) >= today
        );

        const totalEarnings = deliveredToday.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

        return {
            count: deliveredToday.length,
            earnings: totalEarnings,
            history: [...deliveredToday].reverse().slice(0, 20)
        };
    }, [activeOrders]);

    const activeDelivery = deliveries[0];

    const handlePickup = (orderId: string) => {
        setConfirmingId(orderId);
        setTimeout(() => {
            updateOrderStatus(orderId, "delivering");
            setConfirmingId(null);
        }, 800);
    };

    const handleConfirmDelivery = (orderId: string) => {
        setConfirmingId(orderId);
        setTimeout(() => {
            updateOrderStatus(orderId, "delivered");
            setConfirmingId(null);
        }, 1000);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans relative overflow-hidden flex flex-col">

            {/* Map Background Simulation */}
            <div className="absolute inset-0 z-0">
                {/* Dark Map Texture */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity grayscale" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900" />

                {activeDelivery && activeDelivery.status === "delivering" && (
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg mb-2 z-10 animate-bounce">
                            Destino
                        </div>
                        <div className="w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-0" />
                    </div>
                )}
                {activeDelivery && (activeDelivery.status === "ready" || activeDelivery.status === "preparing") && (
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg mb-2 z-10 animate-bounce">
                            O Seu Restaurante
                        </div>
                        <Store className="w-8 h-8 text-amber-500 drop-shadow-lg z-0" />
                    </div>
                )}
            </div>

            {/* Header - Uber Eats Style */}
            <header className="relative z-10 p-5 flex justify-between items-start mt-4">
                <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-slate-200 overflow-hidden active:scale-95 transition-transform"
                >
                    <User className="w-6 h-6 text-slate-800" />
                </button>

                <button 
                    onClick={() => setIsOnline(!isOnline)}
                    className={cn(
                        "rounded-full px-5 py-2 flex flex-col items-center justify-center shadow-xl border transition-colors",
                        isOnline ? "bg-slate-900 border-slate-800" : "bg-rose-50 border-rose-200 text-rose-900"
                    )}
                >
                    <div className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1",
                        isOnline ? "text-emerald-400" : "text-rose-600"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                        )} />
                        {isOnline ? "Online" : "Offline"}
                    </div>
                    <div className={cn(
                        "font-black text-sm truncate max-w-[120px]",
                        isOnline ? "text-white" : "text-rose-900"
                    )}>
                        {user?.name || "Entregador"}
                    </div>
                </button>
            </header>

            {/* Floating Top Warning if empty */}
            {!activeDelivery && (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
                    {isOnline ? (
                        <>
                            <div className="w-24 h-24 rounded-full bg-slate-800/80 backdrop-blur-xl flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
                                <div className="w-4 h-4 rounded-full bg-indigo-500 animate-ping" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 tracking-tight">Procurando...</h2>
                            <p className="text-slate-400 text-center font-medium">Você está online. Vá para áreas de alta demanda.</p>
                        </>
                    ) : (
                        <>
                            <div className="w-24 h-24 rounded-full bg-slate-800/80 backdrop-blur-xl flex items-center justify-center mb-6 shadow-2xl border border-slate-700">
                                <Power className="w-8 h-8 text-rose-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 tracking-tight">Você está Offline</h2>
                            <p className="text-slate-400 text-center font-medium">Fique online para começar a receber pedidos do restaurante.</p>
                        </>
                    )}
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

                        {/* Header */}
                        <div className="flex justify-between items-center mb-6 mt-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    {activeDelivery.status === "preparing" ? "A Preparar" : activeDelivery.status === "ready" ? "Coleta Necessária" : "Entrega em Andamento"}
                                </div>
                                <h2 className="text-4xl font-black text-white tracking-tighter">
                                    {activeDelivery.status === "delivering"
                                        ? (distanceInfo ? `${distanceInfo.minutes} min` : "...")
                                        : "Balcão"}
                                </h2>
                                <p className="text-slate-300 font-medium text-lg mt-1">
                                    {activeDelivery.status === "preparing"
                                        ? "Aguarde confeção"
                                        : activeDelivery.status === "ready"
                                        ? "Dirija-se ao restaurante"
                                        : distanceInfo ? `${distanceInfo.km} de distância` : "Calculando rota..."}
                                </p>
                            </div>
                            {activeDelivery.status === "delivering" && activeDelivery.deliveryAddress ? (
                                <button
                                    onClick={() => openGoogleMaps(activeDelivery.deliveryAddress!)}
                                    className="w-16 h-16 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 flex flex-col items-center justify-center shadow-lg shadow-blue-700/40 transition-all"
                                    title="Abrir no Google Maps"
                                >
                                    <Navigation className="w-6 h-6 text-white mb-0.5" />
                                    <span className="text-[9px] font-bold text-blue-100 uppercase tracking-wider">Maps</span>
                                </button>
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-amber-500 flex flex-col items-center justify-center shadow-lg">
                                    <Store className="w-6 h-6 text-white mb-1" />
                                </div>
                            )}
                        </div>

                        {/* Customer Info Card Uber Style */}
                        {activeDelivery.status === "delivering" ? (
                            <div className="bg-slate-800 border-l-4 border-l-blue-500 rounded-r-2xl p-5 mb-4 shadow-md animate-in slide-in-from-bottom-4 duration-500">
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
                                    <MapPin className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-medium text-slate-100 leading-snug">
                                            {activeDelivery.deliveryAddress}
                                        </p>

                                        {/* Dynamic delivery note from customer */}
                                        {activeDelivery.deliveryNote ? (
                                            <div className="mt-2 flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                                <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-sm text-amber-200 font-medium leading-snug">{activeDelivery.deliveryNote}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-500/10 border-l-4 border-l-amber-500 rounded-r-2xl p-5 mb-4 shadow-md text-amber-200/80 italic animate-in fade-in">
                                <p className="font-medium text-amber-500 mb-1">Destino Oculto.</p>
                                <p className="text-sm">Confirme a retirada do pedido no balcão do restaurante para liberar o endereço do cliente.</p>
                            </div>
                        )}

                        {/* Order Details */}
                        <div className="bg-slate-800/50 rounded-2xl p-5 mb-2">
                            <div className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3 flex items-center justify-between">
                                <span>Pedido #{activeDelivery.orderNumber || activeDelivery.id.split('_')[2]}</span>
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

                    {/* Action Button Area */}
                    <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0 pb-10">
                        {activeDelivery.status === "preparing" ? (
                            <div className="w-full h-[72px] bg-slate-800 rounded-full flex flex-col items-center justify-center border border-amber-500/20 shadow-inner">
                                <span className="text-amber-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Em Confeção
                                </span>
                                <span className="text-xs text-slate-400 mt-0.5">Aguardando a Cozinha</span>
                            </div>
                        ) : activeDelivery.status === "ready" ? (
                            <button
                                onClick={() => handlePickup(activeDelivery.id)}
                                disabled={confirmingId === activeDelivery.id}
                                className="w-full h-[72px] bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-900 font-bold text-lg rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {confirmingId === activeDelivery.id ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Confirmando...</>
                                ) : (
                                    <><Store className="w-6 h-6" /> Retirado no Balcão</>
                                )}
                            </button>
                        ) : (
                            <SwipeToConfirm 
                                onConfirm={() => handleConfirmDelivery(activeDelivery.id)}
                                isConfirming={confirmingId === activeDelivery.id}
                            />
                        )}
                    </div>

                </div>
            )}

            {/* Profile Overlay */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    <div className="p-6 flex justify-between items-center shadow-sm z-10 bg-slate-900">
                        <h2 className="text-2xl font-black text-white">Minha Conta</h2>
                        <button onClick={() => setIsProfileOpen(false)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 active:bg-slate-700 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-3" />
                                <div className="text-3xl font-black text-white">{todayMetrics.count}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Entregas Hoje</div>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col justify-center">
                                <Banknote className="w-8 h-8 text-emerald-400 mb-3" />
                                <div className="text-3xl font-black text-white">{formatCurrency(todayMetrics.earnings)}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Acumulado Hoje</div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                            <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-300" />
                                <h3 className="font-bold text-white">Últimas Entregas</h3>
                            </div>
                            <div className="divide-y divide-slate-700">
                                {todayMetrics.history.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-sm">Nenhuma entrega finalizada hoje.</div>
                                ) : todayMetrics.history.map(order => (
                                    <div key={order.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-200">Pedido #{order.orderNumber || order.id.split('_')[2]}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                        <div className="font-bold text-emerald-400">+{formatCurrency(order.deliveryFee || 0)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-800 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] bg-slate-900 mt-auto">
                        <button 
                            onClick={() => {
                                if (confirm("Tem certeza que deseja fechar seu turno (sair da conta)?")) {
                                    logout();
                                }
                            }}
                            className="w-full h-14 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-500 rounded-xl font-bold flex items-center justify-center gap-2 border border-rose-500/20 transition-colors"
                        >
                            <LogOut className="w-5 h-5" /> Fazer Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
