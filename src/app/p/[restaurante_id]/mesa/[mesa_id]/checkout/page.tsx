"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BillSummary } from "@/components/client/BillSummary";
import { TipSelector } from "@/components/client/TipSelector";
import { PaymentGateway } from "@/components/client/PaymentGateway";
import { Store, Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useOrders } from "@/lib/OrderContext";

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { placeOrder } = useOrders();

    const [restaurant, setRestaurant] = useState<any>(null);
    const [tipPercentage, setTipPercentage] = useState<number>(0);
    const [customerNif, setCustomerNif] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // In a real app, restaurant_id and mesa_id come from params
        const restaurantId = params.restaurante_id as string || "rest_123";
        const tableId = Number(params.mesa_id || 1);

        const loadData = async () => {
            try {
                const { data, error } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
                if (error) throw error;
                if (data) setRestaurant(data);
                // Intentionally setting the default tip to 0% so the user chooses explicitly
                setTipPercentage(0);
            } catch (error) {
                console.error("Failed to load checkout data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [params]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    if (!restaurant) {
        return <div className="p-6 text-center text-slate-500">Mesa não encontrada.</div>;
    }

    const tipAmount = cartTotal * (tipPercentage / 100);
    const totalAmount = cartTotal + tipAmount;

    const handlePaymentSuccess = async (transactionId: string, method: string, status: string) => {
        setIsSubmitting(true);
        try {
            // Here we explicitly define what payment method creates a pending state
            const finalStatus = (method === "cash" || method === "vinti4") ? "pending" : "paid";

            const result = await placeOrder(
                restaurant.id,
                parseInt(params.mesa_id as string) || 1,
                cartItems.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity || 1 })),
                cartTotal,
                tipAmount,
                method as any,
                finalStatus as any,
                "in_store",
                undefined, // customerName
                undefined, // customerPhone
                customerNif || undefined
            );
            clearCart();
            const txId = result?.orderNumber || transactionId;
            router.push(`/p/${restaurant.id}/success?tx=${txId}&table=${params.mesa_id || 1}`);
        } catch (err) {
            console.error("Failed to place order", err);
            alert("Ocorreu um erro ao processar seu pedido. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12 text-slate-900 relative">
            {isSubmitting && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">Enviando para a Cozinha...</h3>
                    <p className="text-slate-500 text-sm mt-2">Aguarde um momento</p>
                </div>
            )}
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm border-b border-slate-100 sticky top-0 z-50 w-full">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => router.push(`/p/${restaurant.id}/mesa/${params.mesa_id || 1}?cart=open`)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-900 leading-tight">Checkout</h1>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Store className="w-3 h-3" /> Mesa {params.mesa_id || 1}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="px-6 py-6 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-primary-600" /> Seu Pedido
                </h2>

                {cartItems.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
                        <p>Seu carrinho está vazio.</p>
                        <button onClick={() => router.push(`/p/${restaurant.id}/mesa/${params.mesa_id || 1}`)} className="mt-4 text-primary-600 font-semibold hover:underline">Voltar ao Menu</button>
                    </div>
                ) : (
                    <>
                        <BillSummary items={cartItems} subtotal={cartTotal} />

                        <div className="mt-8">
                            <TipSelector
                                defaultPercentage={0}
                                onTipChange={setTipPercentage}
                            />
                        </div>

                        <div className="border-t border-dashed border-slate-300 my-8"></div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between">
                                <span>Contribuinte / NIF (Opcional)</span>
                                <span className="text-[10px] font-medium bg-slate-200 px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest">Fatura</span>
                            </label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                maxLength={9} 
                                value={customerNif} 
                                onChange={e => setCustomerNif(e.target.value)} 
                                placeholder="Insira o NIF" 
                                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 font-mono tracking-widest transition-shadow" 
                            />
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 mb-6">Pagamento</h2>

                        <PaymentGateway
                            totalAmount={totalAmount}
                            onSuccess={handlePaymentSuccess}
                        />
                    </>
                )}
            </main>
        </div>
    );
}
