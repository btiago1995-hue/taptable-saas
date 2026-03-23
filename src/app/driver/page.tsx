"use client";

import { useOrders, LiveOrder } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import { useState, useMemo, useRef, useEffect } from "react";
import {
    Clock, MapPin, PhoneCall, Navigation, ArrowRight, User, Loader2,
    Store, Power, LogOut, X, Banknote, CheckCircle2, History,
    MessageSquare, Package, ChevronRight, Bike
} from "lucide-react";

// ─── Swipe to Confirm ────────────────────────────────────────────────────────

function SwipeToConfirm({ onConfirm, isConfirming }: { onConfirm: () => void; isConfirming: boolean }) {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [unlocked, setUnlocked] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isConfirming && unlocked) { setUnlocked(false); setDragX(0); }
    }, [isConfirming]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isConfirming || unlocked) return;
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || isConfirming || unlocked || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const maxDrag = rect.width - 72;
        let newX = Math.max(0, Math.min(e.clientX - rect.left - 36, maxDrag));
        setDragX(newX);
        if (newX > maxDrag * 0.7) { setUnlocked(true); setIsDragging(false); setDragX(maxDrag); onConfirm(); }
    };
    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (!unlocked) setDragX(0);
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-16 rounded-2xl overflow-hidden touch-none select-none transition-all duration-300",
                (isConfirming || unlocked) ? "bg-emerald-500" : "bg-emerald-600 shadow-[0_4px_24px_rgba(16,185,129,0.35)]"
            )}
        >
            {(isConfirming || unlocked) ? (
                <div className="absolute inset-0 flex items-center justify-center font-black text-base text-white tracking-widest uppercase gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Entrega Concluída!
                </div>
            ) : (
                <>
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-base text-white/70 tracking-widest uppercase">
                        Deslize para Concluir
                    </div>
                    <div
                        className="absolute top-2 bottom-2 left-2 bg-white/20 rounded-xl z-10"
                        style={{ width: dragX > 0 ? dragX + 52 : 52, transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.175,0.885,0.32,1.275)' }}
                    >
                        <div
                            className="absolute right-0 top-0 bottom-0 w-12 bg-white rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                        >
                            <ArrowRight className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ status }: { status: string }) {
    const steps = [
        { key: "preparing", label: "Preparando" },
        { key: "ready",     label: "Pronto" },
        { key: "delivering", label: "A caminho" },
        { key: "delivered", label: "Entregue" },
    ];
    const currentIdx = steps.findIndex(s => s.key === status);

    return (
        <div className="flex items-center gap-1 w-full">
            {steps.map((step, idx) => {
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className={cn(
                                "w-2 h-2 rounded-full mb-1 transition-all",
                                done ? "bg-emerald-400" : active ? "bg-white scale-125" : "bg-slate-600"
                            )} />
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wide truncate w-full text-center",
                                done ? "text-emerald-400" : active ? "text-white" : "text-slate-600"
                            )}>{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={cn("h-px flex-1 mx-1 mb-3 transition-all", done ? "bg-emerald-400" : "bg-slate-700")} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DriverDashboard() {
    const { orders: activeOrders, updateOrderStatus } = useOrders();
    const { user, loading: authLoading, logout } = useAuth();
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [distanceInfo, setDistanceInfo] = useState<{ km: string; minutes: number } | null>(null);

    const deliveries = useMemo(() => {
        if (!isOnline || !user?.id) return [];
        return activeOrders
            .filter((o: LiveOrder) =>
                o.orderType === "delivery" &&
                (o.status === "preparing" || o.status === "ready" || o.status === "delivering") &&
                o.assignedDriverId === user.id
            )
            .reverse();
    }, [activeOrders, isOnline, user?.id]);

    // GPS
    useEffect(() => {
        if (!navigator.geolocation) return;
        const watchId = navigator.geolocation.watchPosition(
            pos => setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Haversine
    const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Distance calc
    useEffect(() => {
        const delivery = deliveries[0];
        if (!delivery || delivery.status !== "delivering" || !delivery.deliveryAddress || !driverCoords) {
            setDistanceInfo(null); return;
        }
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(delivery.deliveryAddress)}&format=json&limit=1`)
            .then(r => r.json())
            .then(results => {
                if (results?.[0]) {
                    const km = haversineKm(driverCoords.lat, driverCoords.lng, parseFloat(results[0].lat), parseFloat(results[0].lon));
                    setDistanceInfo({ km: km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`, minutes: Math.round((km / 25) * 60) });
                }
            })
            .catch(() => setDistanceInfo(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deliveries[0]?.id, driverCoords]);

    const todayMetrics = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const done = activeOrders.filter(o =>
            o.orderType === "delivery" && o.status === "delivered" &&
            o.assignedDriverId === user?.id && new Date(o.createdAt) >= today
        );
        return {
            count: done.length,
            earnings: done.reduce((s, o) => s + (o.deliveryFee || 0), 0),
            history: [...done].reverse().slice(0, 20)
        };
    }, [activeOrders, user?.id]);

    const activeDelivery = deliveries[0];
    const queuedDeliveries = deliveries.slice(1);

    const handlePickup = (orderId: string) => {
        setConfirmingId(orderId);
        setTimeout(() => { updateOrderStatus(orderId, "delivering"); setConfirmingId(null); }, 800);
    };
    const handleConfirmDelivery = (orderId: string) => {
        setConfirmingId(orderId);
        setTimeout(() => { updateOrderStatus(orderId, "delivered"); setConfirmingId(null); }, 1000);
    };

    const initials = user?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "D";

    if (authLoading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden flex flex-col">

            {/* Map-style background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 grayscale" />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-slate-950" />

                {/* Map pin */}
                {activeDelivery?.status === "delivering" && (
                    <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg mb-2 animate-bounce">Destino</div>
                        <div className="w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
                    </div>
                )}
                {activeDelivery && activeDelivery.status !== "delivering" && (
                    <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-amber-500 text-slate-900 px-3 py-1 rounded-full text-[10px] font-bold shadow-lg mb-2 animate-bounce">Restaurante</div>
                        <Store className="w-7 h-7 text-amber-400 drop-shadow-lg" />
                    </div>
                )}
            </div>

            {/* ── Header ── */}
            <header className="relative z-10 px-5 pt-6 pb-2 flex justify-between items-center">
                <button
                    onClick={() => setIsProfileOpen(true)}
                    className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-white shadow-md active:scale-95 transition-transform"
                >
                    {initials}
                </button>

                {/* Stats pill */}
                <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-full px-4 py-1.5 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-white">{todayMetrics.count} entregas</span>
                    <span className="w-px h-3 bg-slate-700" />
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">{formatCurrency(todayMetrics.earnings)}</span>
                </div>

                {/* Online toggle */}
                <button
                    onClick={() => setIsOnline(!isOnline)}
                    className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-95",
                        isOnline ? "bg-emerald-500 border-emerald-400 shadow-emerald-500/30" : "bg-slate-800 border-slate-700"
                    )}
                    title={isOnline ? "Ficar Offline" : "Ficar Online"}
                >
                    <Power className={cn("w-5 h-5", isOnline ? "text-white" : "text-slate-500")} />
                </button>
            </header>

            {/* ── Idle State ── */}
            {!activeDelivery && (
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-12 gap-4">
                    {isOnline ? (
                        <>
                            <div className="relative w-28 h-28 flex items-center justify-center mb-2">
                                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
                                <div className="absolute inset-2 rounded-full bg-emerald-500/10 animate-ping [animation-delay:0.3s]" />
                                <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-2xl z-10">
                                    <Bike className="w-9 h-9 text-emerald-400" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Pronto para Entregar</h2>
                            <p className="text-slate-400 text-sm text-center max-w-[240px] leading-relaxed">
                                Aguardando atribuição pelo gestor. Fique por perto do restaurante.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-2xl mb-2">
                                <Power className="w-9 h-9 text-rose-500" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">Turno Pausado</h2>
                            <p className="text-slate-400 text-sm text-center max-w-[240px]">
                                Liga-te para receber pedidos.
                            </p>
                            <button
                                onClick={() => setIsOnline(true)}
                                className="mt-2 px-8 py-3 bg-emerald-500 text-white font-bold rounded-full shadow-lg active:scale-95 transition-transform"
                            >
                                Ligar
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Active Delivery Sheet ── */}
            {activeDelivery && (
                <div className="relative z-20 mt-auto bg-slate-900 rounded-t-[2rem] border-t border-slate-800 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] flex flex-col max-h-[88vh] overflow-hidden">

                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-10 h-1 bg-slate-700 rounded-full" />
                    </div>

                    {/* Step progress */}
                    <div className="px-6 pt-3 pb-4 shrink-0 border-b border-slate-800">
                        <StepIndicator status={activeDelivery.status} />
                    </div>

                    <div className="px-6 pt-4 pb-2 overflow-y-auto flex-1">

                        {/* Main info row */}
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                                    {activeDelivery.status === "preparing" ? "A Preparar" :
                                     activeDelivery.status === "ready" ? "Pronto — Ir ao Balcão" :
                                     "Em Rota"}
                                </p>
                                <h2 className="text-4xl font-black tracking-tighter leading-none">
                                    {activeDelivery.status === "delivering"
                                        ? (distanceInfo ? `${distanceInfo.minutes} min` : "—")
                                        : "Balcão"}
                                </h2>
                                <p className="text-slate-400 font-medium mt-1">
                                    {activeDelivery.status === "preparing" ? "Aguarde a cozinha" :
                                     activeDelivery.status === "ready" ? "Dirija-se ao restaurante" :
                                     distanceInfo ? `${distanceInfo.km} de distância` : "Calculando rota..."}
                                </p>
                            </div>

                            {activeDelivery.status === "delivering" && activeDelivery.deliveryAddress ? (
                                <button
                                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeDelivery.deliveryAddress!)}&travelmode=driving`, '_blank')}
                                    className="w-14 h-14 rounded-2xl bg-blue-600 flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
                                >
                                    <Navigation className="w-5 h-5 text-white mb-0.5" />
                                    <span className="text-[9px] font-bold text-blue-100 uppercase">Maps</span>
                                </button>
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                    <Store className="w-6 h-6 text-amber-400" />
                                </div>
                            )}
                        </div>

                        {/* Customer Card */}
                        {activeDelivery.status === "delivering" ? (
                            <div className="bg-slate-800 rounded-2xl p-4 mb-4 border border-slate-700/50">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{activeDelivery.customerName || "Cliente"}</h3>
                                        {activeDelivery.paymentStatus === "paid" ? (
                                            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Pago via App</span>
                                        ) : (
                                            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                Cobrar {formatCurrency(activeDelivery.totalAmount + (activeDelivery.deliveryFee || 0))}
                                            </span>
                                        )}
                                    </div>
                                    {activeDelivery.customerPhone && (
                                        <a
                                            href={`tel:${activeDelivery.customerPhone}`}
                                            className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center active:bg-slate-600 transition-colors"
                                        >
                                            <PhoneCall className="w-4 h-4 text-white" />
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-start gap-2.5 pt-3 border-t border-slate-700/60">
                                    <MapPin className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 leading-snug">{activeDelivery.deliveryAddress}</p>
                                        {activeDelivery.deliveryNote && (
                                            <div className="mt-2 flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                                                <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-xs text-amber-200 leading-snug">{activeDelivery.deliveryNote}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4">
                                <p className="font-bold text-amber-400 text-sm mb-1">Endereço bloqueado</p>
                                <p className="text-xs text-amber-200/70 leading-relaxed">
                                    Confirme a retirada no balcão para desbloquear o endereço do cliente.
                                </p>
                            </div>
                        )}

                        {/* Order items */}
                        <div className="bg-slate-800/60 rounded-2xl p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    Pedido #{activeDelivery.orderNumber || activeDelivery.id.substring(0, 6).toUpperCase()}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{activeDelivery.items.length} itens</span>
                            </div>
                            <div className="space-y-2.5">
                                {activeDelivery.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">{item.quantity}</span>
                                        <span className="text-sm text-slate-200 font-medium truncate">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Queue */}
                        {queuedDeliveries.length > 0 && (
                            <div className="bg-slate-800/40 rounded-2xl p-4 mb-2 border border-slate-700/30">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                                    Na fila ({queuedDeliveries.length})
                                </p>
                                {queuedDeliveries.map(o => (
                                    <div key={o.id} className="flex items-center justify-between py-2 border-t border-slate-700/40 first:border-0">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-300">{o.customerName || "Cliente"}</p>
                                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{o.deliveryAddress || "—"}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Action Button ── */}
                    <div className="px-6 pt-3 pb-8 bg-slate-900 border-t border-slate-800 shrink-0">
                        {activeDelivery.status === "preparing" ? (
                            <div className="w-full h-16 bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-amber-500/20">
                                <span className="text-amber-400 font-bold text-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Em Preparação
                                </span>
                                <span className="text-xs text-slate-500 mt-0.5">Aguardando a cozinha</span>
                            </div>
                        ) : activeDelivery.status === "ready" ? (
                            <button
                                onClick={() => handlePickup(activeDelivery.id)}
                                disabled={confirmingId === activeDelivery.id}
                                className="w-full h-16 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-900 font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all disabled:opacity-60"
                            >
                                {confirmingId === activeDelivery.id
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirmando...</>
                                    : <><Store className="w-5 h-5" /> Retirei no Balcão</>
                                }
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

            {/* ── Profile Overlay ── */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    {/* Header */}
                    <div className="px-6 pt-8 pb-6 flex items-center gap-4 border-b border-slate-800">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-black text-white">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-black text-white truncate">{user?.name || "Entregador"}</h2>
                            <p className="text-sm text-slate-400 font-medium">Entregador • Turno ativo</p>
                        </div>
                        <button
                            onClick={() => setIsProfileOpen(false)}
                            className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center active:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                                <CheckCircle2 className="w-7 h-7 text-emerald-400 mb-2.5" />
                                <div className="text-3xl font-black text-white">{todayMetrics.count}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Entregas Hoje</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                                <Banknote className="w-7 h-7 text-emerald-400 mb-2.5" />
                                <div className="text-2xl font-black text-emerald-400">{formatCurrency(todayMetrics.earnings)}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ganhos Hoje</div>
                            </div>
                        </div>

                        {/* History */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-400" />
                                <span className="font-bold text-sm text-white">Histórico de Hoje</span>
                            </div>
                            {todayMetrics.history.length === 0 ? (
                                <div className="py-8 text-center text-slate-500 text-sm">Nenhuma entrega finalizada hoje.</div>
                            ) : todayMetrics.history.map(o => (
                                <div key={o.id} className="px-4 py-3 flex justify-between items-center border-t border-slate-800/60 first:border-0">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">
                                            #{o.orderNumber || o.id.substring(0, 6).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {o.customerName ? ` • ${o.customerName}` : ""}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-400">+{formatCurrency(o.deliveryFee || 0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 pb-10 pt-4 border-t border-slate-800 bg-slate-950">
                        <button
                            onClick={() => { if (confirm("Fechar turno e sair?")) logout(); }}
                            className="w-full h-13 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 rounded-xl font-bold flex items-center justify-center gap-2 border border-rose-500/20 transition-colors"
                        >
                            <LogOut className="w-4 h-4" /> Fechar Turno
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
