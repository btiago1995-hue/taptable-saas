"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { DigitalMenu } from "@/components/client/DigitalMenu";
import { Store, Loader2, Info, ShoppingCart, Truck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/CartContext";
import { CartReview } from "@/components/client/CartReview";

export default function DeliveryMenuPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { cartTotal, cartItemCount } = useCart();

    const [restaurant, setRestaurant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false);

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

    useEffect(() => {
        if (searchParams.get("cart") === "open") {
            setIsCartOpen(true);
        }
    }, [searchParams]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!restaurant) {
        return <div className="p-6 text-center text-slate-500">Restaurante não encontrado.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-40 md:pb-12 text-slate-900 relative">
            {/* Header */}
            <header className="bg-white px-6 py-4 shadow-sm border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-inner">
                        <Truck className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900 leading-tight">{restaurant.name}</h1>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            Delivery & Retirada
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-6 py-6 max-w-md mx-auto">
                <div className="mb-6 flex gap-3 p-4 bg-indigo-50 text-indigo-800 rounded-xl items-start shadow-sm border border-indigo-100">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-500" />
                    <div>
                        <p className="text-sm font-bold">Faça seu pedido online!</p>
                        <p className="text-xs opacity-90 mt-1">Escolha seus pratos favoritos e decida no final se prefere receber em casa ou retirar no balcão.</p>
                    </div>
                </div>

                <DigitalMenu />
            </main>

            {/* Floating Checkout Button */}
            {cartItemCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-6">
                    <div className="max-w-md mx-auto relative cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <div className="absolute -top-3 -right-2 bg-rose-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold shadow-sm z-10 border-2 border-white">
                            {cartItemCount}
                        </div>

                        <div className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 shadow-lg">
                            <span className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                Ver Carrinho
                            </span>
                            <span>{formatCurrency(cartTotal)}</span>
                        </div>
                    </div>
                </div>
            )}

            <CartReview 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                checkoutUrl={`/p/${restaurant.id}/delivery/checkout`} 
            />
        </div>
    );
}
