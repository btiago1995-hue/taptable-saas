"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Truck, Store, Clock, MapPin, ChevronRight, Star, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image"; // In a real app we'd use Next Image, here we simulate

export default function RestaurantLandingPage() {
    const params = useParams();
    const router = useRouter();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const restaurantId = params.restaurante_id as string || "rest_123";

    // Loyalty State
    const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
    const [loyaltyPhone, setLoyaltyPhone] = useState("");
    const [loyaltyResult, setLoyaltyResult] = useState<any>(null);
    const [isCheckingLoyalty, setIsCheckingLoyalty] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data, error } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
                if (error) throw error;
                if (data) setRestaurant(data);
            } catch (error) {
                console.error("Failed to load restaurant data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [restaurantId]);

    const checkLoyalty = async () => {
        if (!loyaltyPhone) return;
        setIsCheckingLoyalty(true);
        try {
            const { data, error } = await supabase
                .from('loyalty_customers')
                .select('*')
                .eq('restaurant_id', restaurantId)
                .eq('phone_number', loyaltyPhone)
                .single();
                
            if (data) {
                setLoyaltyResult(data);
            } else {
                setLoyaltyResult({ stars: 0, new: true });
            }
        } catch (e) {
            setLoyaltyResult({ stars: 0, new: true });
        }
        setIsCheckingLoyalty(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!restaurant) {
        return <div className="p-6 text-center text-slate-500">Restaurante não encontrado.</div>;
    }

    if (restaurant.is_active === false) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner shadow-red-200">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Serviço Temporariamente Indisponível</h1>
                <p className="text-lg text-slate-500 max-w-md mx-auto mb-8 font-medium">O acesso a este cardápio digital está suspenso no momento. Por favor, contate o estabelecimento diretamente.</p>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Powered by Dineo SaaS
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Hero Cover */}
            <div className="w-full h-64 md:h-80 relative bg-slate-800 overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80')` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 max-w-2xl mx-auto flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center p-2 mb-4 -mt-12 overflow-hidden border-4 border-slate-50 relative z-10">
                        {/* Placeholder Logo */}
                        <div className="w-full h-full bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Store className="w-10 h-10 text-indigo-500" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">{restaurant.name}</h1>
                    <div className="flex items-center gap-4 text-sm font-medium text-slate-200 justify-center flex-wrap">
                        <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Novo</span>
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        <span>Restaurante & Bebidas</span>
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Centro</span>
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-5 -mt-6 relative z-20">
                {/* Status Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 mb-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Aberto Agora
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Aceitando pedidos até 23:00</div>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        30 - 45 min
                    </div>
                </div>

                {/* Loyalty Card */}
                <button 
                    onClick={() => setIsLoyaltyModalOpen(true)}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl shadow-lg shadow-amber-500/20 border border-amber-300 p-4 mb-8 flex items-center justify-between text-amber-950 hover:scale-[1.02] transition-transform active:scale-95"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Star className="w-7 h-7 fill-amber-900/80 text-amber-900" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-extrabold text-lg leading-tight uppercase tracking-tight">Clube de Fidelidade</h3>
                            <p className="text-sm font-medium opacity-80">Veja suas estrelas e resgate prêmios</p>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 opacity-60" />
                </button>

                {/* Call to Actions */}
                <h2 className="text-xl font-bold text-slate-900 mb-4 px-1">Como você prefere?</h2>

                <div className="space-y-4">
                    {/* Delivery Option */}
                    <button
                        onClick={() => router.push(`/p/${restaurant.id}/delivery?method=delivery`)}
                        className="w-full bg-white border-2 border-indigo-500 rounded-2xl p-5 flex items-center gap-5 hover:bg-indigo-50 transition-colors shadow-sm text-left group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                            <Truck className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Pedir Delivery</h3>
                            <p className="text-sm text-slate-500 font-medium">Entregamos rápido no conforto da sua casa ou trabalho.</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-indigo-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Pickup Option */}
                    <button
                        onClick={() => router.push(`/p/${restaurant.id}/delivery?method=pickup`)}
                        className="w-full bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-5 hover:border-purple-300 hover:bg-purple-50 transition-colors shadow-sm text-left group active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
                            <Store className="w-7 h-7 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Retirar no Balcão</h3>
                            <p className="text-sm text-slate-500 font-medium">Faça o pedido agora e passe aqui só para pegar. Sem filas.</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-purple-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>



            </main>

            {/* Loyalty Modal */}
            {isLoyaltyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom-8">
                        <button onClick={() => { setIsLoyaltyModalOpen(false); setLoyaltyResult(null); }} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">✕</button>
                        
                        <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner shadow-amber-200">
                            <Star className="w-8 h-8 fill-amber-500" />
                        </div>
                        
                        <h3 className="text-2xl font-black text-center text-slate-900 mb-2">Seu Cartão Fidelidade</h3>
                        <p className="text-slate-500 text-center mb-8 font-medium">Consulte suas estrelas através do número de WhatsApp usado nos pedidos.</p>
                        
                        {!loyaltyResult ? (
                            <div className="space-y-4">
                                <input 
                                    type="tel" 
                                    placeholder="(00) 00000-0000" 
                                    value={loyaltyPhone}
                                    onChange={(e) => setLoyaltyPhone(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                />
                                <button 
                                    onClick={checkLoyalty}
                                    disabled={isCheckingLoyalty || !loyaltyPhone}
                                    className="w-full bg-amber-500 hover:bg-amber-600 border-b-4 border-amber-600 active:border-b-0 active:mt-1 disabled:opacity-50 disabled:border-amber-500 text-white font-black text-lg py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {isCheckingLoyalty ? <Loader2 className="w-6 h-6 animate-spin"/> : "Consultar Minhas Estrelas"}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center animate-in zoom-in-95">
                                <div className="text-7xl font-black text-slate-900 mb-2">{loyaltyResult.stars}</div>
                                <div className="text-sm font-black text-amber-500 tracking-widest uppercase mb-8">Estrelas Acumuladas</div>
                                
                                {loyaltyResult.stars >= 10 ? (
                                    <div className="bg-emerald-50 text-emerald-800 p-5 rounded-2xl border border-emerald-200 mb-6 font-medium">
                                        🎉 <strong>Atingiu a meta!</strong> <br/>Você já possui 10 estrelas e ganhou uma sobremesa gratuita na sua próxima visita presencial.
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 text-slate-600 font-medium">
                                        Faltam <strong className="text-slate-900 text-lg">{10 - loyaltyResult.stars} estrelas</strong> para você resgatar um prêmio 100% por conta da casa!
                                    </div>
                                )}
                                
                                <button onClick={() => { setIsLoyaltyModalOpen(false); setLoyaltyResult(null); }} className="text-slate-400 font-bold hover:text-slate-700 transition-colors">Voltar ao Menu</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
