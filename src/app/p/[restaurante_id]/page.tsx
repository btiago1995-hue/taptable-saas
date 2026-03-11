"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Truck, Store, Clock, MapPin, ChevronRight, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image"; // In a real app we'd use Next Image, here we simulate

export default function RestaurantLandingPage() {
    const params = useParams();
    const router = useRouter();
    const [restaurant, setRestaurant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const restaurantId = params.restaurante_id as string || "rest_123";

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
    }, [params]);

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
        </div>
    );
}
