"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BillSummary } from "@/components/client/BillSummary";
import { Store, Loader2, ArrowLeft, ShoppingBag, Truck, MapPin, CreditCard, Banknote } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { useOrders } from "@/lib/OrderContext";
import { formatCurrency, cn } from "@/lib/utils";

export default function DeliveryCheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { placeOrder } = useOrders();

    const [restaurant, setRestaurant] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [orderMethod, setOrderMethod] = useState<"delivery" | "pickup">("delivery");
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerNif, setCustomerNif] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryNote, setDeliveryNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"card" | "pix" | "cash" | "vinti4">("card");



    useEffect(() => {
        const restaurantId = params.restaurante_id as string || "rest_123";

        const loadData = async () => {
            try {
                const { data, error } = await supabase
                    .from('restaurants')
                    .select('id, name, delivery_fee, vinti4_pos_id, vinti4_pos_aut_code')
                    .eq('id', restaurantId)
                    .single();
                if (error) throw error;
                if (data) setRestaurant(data);
            } catch (error) {
                console.error("Failed to load checkout data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [params]);

    // Handle form toggle constraints
    useEffect(() => {
        if (orderMethod === "delivery" && paymentMethod === "cash") {
            setPaymentMethod("card"); // Usually you restrict cash on delivery
        }
    }, [orderMethod, paymentMethod]);

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

    const deliveryFee = restaurant.delivery_fee ? Number(restaurant.delivery_fee) : 0;
    const currentDeliveryFee = orderMethod === "delivery" ? deliveryFee : 0;
    const totalAmount = cartTotal + currentDeliveryFee; // Not asking for tip on delivery

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return; // FIX: Prevent multiple taps generating 3 ghost orders

        if (!customerName || !customerPhone || (orderMethod === "delivery" && !deliveryAddress)) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        // For Vinti4, the order starts as pending and the webhook will update it to paid.
        const finalStatus = (paymentMethod === "cash" || paymentMethod === "vinti4") ? "pending" : "paid";

        setIsSubmitting(true);
        try {
            const result = await placeOrder(
            restaurant.id,
            0, // No table for delivery/pickup
            cartItems.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity || 1 })),
            cartTotal,
            0, // No tip
            paymentMethod,
            finalStatus,
            orderMethod,
            customerName,
            customerPhone,
            customerNif || undefined,
            deliveryAddress,
            currentDeliveryFee,
            deliveryNote || undefined
        );
        clearCart();
        
        const txId = result?.orderNumber || `tx_${Date.now()}`;

        // VINTI4 GATEWAY REDIRECT LOGIC
        if (paymentMethod === "vinti4") {
             try {
                 const res = await fetch('/api/vinti4/checkout', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         orderId: result?.orderId || txId,
                         amount: totalAmount,
                         restaurantId: restaurant.id
                     })
                 });
                 
                 const data = await res.json();
                 if (!res.ok) throw new Error(data.error || "Erro ao conectar com Vinti4");

                 // Programmatically create a form to submit via POST to SISP
                 const form = document.createElement('form');
                 form.method = 'POST';
                 form.action = data.actionUrl;
                 
                 // Append all required hidden fields
                 Object.keys(data.formData).forEach(key => {
                     const hiddenField = document.createElement('input');
                     hiddenField.type = 'hidden';
                     hiddenField.name = key;
                     hiddenField.value = data.formData[key];
                     form.appendChild(hiddenField);
                 });

                 document.body.appendChild(form);
                 form.submit(); // Takes the user to SISP Gateway!
                 return; // Do not redirect to local success yet
             } catch (err: any) {
                 alert(err.message);
                 setIsSubmitting(false);
                 router.push(`/p/${restaurant.id}/delivery?method=${orderMethod}`); // fallback
                 return;
             }
        }

        router.push(`/p/${restaurant.id}/success?tx=${txId}&method=${orderMethod}`);
        // We do not set isSubmitting to false here because we are redirecting away. 
        // Keeping it true prevents the user from clicking again during the redirect.
    } catch (e: any) {
        console.error("Failed to place order", e);
        alert("Ocorreu um erro ao processar o seu pedido. Tente novamente.");
        setIsSubmitting(false);
    }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-40 md:pb-12 text-slate-900 overflow-x-hidden">
            <header className="bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm border-b border-slate-100 sticky top-0 z-50 w-full animate-in fade-in duration-500">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => router.push(`/p/${restaurant.id}/delivery?cart=open`)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-900 leading-tight">Finalizar Pedido</h1>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                            <Store className="w-3 h-3" /> {restaurant.name}
                        </p>
                    </div>
                </div>
            </header>

            <main className="px-6 py-6 max-w-md mx-auto">

                {cartItems.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500 mt-6">
                        <p>Seu carrinho está vazio.</p>
                        <button onClick={() => router.push(`/p/${restaurant.id}/delivery`)} className="mt-4 text-primary-600 font-semibold hover:underline">Voltar ao Menu</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>

                        {/* Method Selector */}
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Truck className="w-5 h-5 text-indigo-500" /> Como você quer receber?
                            </h2>
                            <div className="flex gap-4">
                                <label className={cn(
                                    "flex-1 border-2 rounded-xl p-4 text-center cursor-pointer transition-all",
                                    orderMethod === "delivery" ? "border-indigo-500 relative ring-4 ring-indigo-500/10 shadow-sm" : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                                )}>
                                    <input type="radio" name="method" value="delivery" checked={orderMethod === "delivery"} onChange={() => setOrderMethod("delivery")} className="sr-only" />
                                    <Truck className={cn("w-6 h-6 mx-auto mb-2", orderMethod === "delivery" ? "text-indigo-500" : "text-slate-400")} />
                                    <span className="font-bold">Delivery</span>
                                </label>
                                <label className={cn(
                                    "flex-1 border-2 rounded-xl p-4 text-center cursor-pointer transition-all",
                                    orderMethod === "pickup" ? "border-purple-500 relative ring-4 ring-purple-500/10 shadow-sm" : "border-slate-200 text-slate-500 bg-white hover:border-slate-300"
                                )}>
                                    <input type="radio" name="method" value="pickup" checked={orderMethod === "pickup"} onChange={() => setOrderMethod("pickup")} className="sr-only" />
                                    <Store className={cn("w-6 h-6 mx-auto mb-2", orderMethod === "pickup" ? "text-purple-500" : "text-slate-400")} />
                                    <span className="font-bold">Retirada</span>
                                </label>
                            </div>
                        </div>

                        {/* Customer Info Form */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Seu Nome</label>
                                <input required type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Como devemos te chamar" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">WhatsApp</label>
                                <input required type="tel" inputMode="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center justify-between">
                                    <span>NIF (Opcional)</span>
                                    <span className="text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-400">Para Fatura</span>
                                </label>
                                <input type="text" inputMode="numeric" maxLength={9} value={customerNif} onChange={e => setCustomerNif(e.target.value)} placeholder="000 000 000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono tracking-widest" />
                            </div>

                            {orderMethod === "delivery" && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase mt-2">Endereço de Entrega Completo</label>
                                        <textarea required rows={2} value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Rua, Número, Bairro, Complemento" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase flex items-center justify-between">
                                            <span>Nota para o Entregador</span>
                                            <span className="text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-400">Opcional</span>
                                        </label>
                                        <textarea rows={2} value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="Ex: Toque o interfone nº 3B, portão azul, 2º andar..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order Summary */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-8">
                            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <ShoppingBag className="w-4 h-4 text-slate-500" /> Detalhes do Pedido
                            </h3>

                            <div className="space-y-2 mb-4">
                                {cartItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-slate-600"><span className="text-slate-400 mr-1">{item.quantity}x</span> {item.name}</span>
                                        <span className="text-slate-800 font-medium">{formatCurrency((item.price * (item.quantity || 1)))}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(cartTotal)}</span>
                                </div>

                                {orderMethod === "delivery" && (
                                    <div className="flex justify-between text-indigo-600 font-medium animate-in fade-in">
                                        <span>Taxa de Entrega</span>
                                        <span>{formatCurrency(deliveryFee)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between font-bold text-slate-900 text-lg pt-2">
                                    <span>Total</span>
                                    <span>{formatCurrency(totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Selector */}
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-500" /> Pagamento
                            </h2>
                            <div className="space-y-3">
                                
                                {/* Vinti4 Option */}
                                <label className={cn(
                                    "flex items-center gap-4 border-2 rounded-xl p-4 cursor-pointer transition-all",
                                    paymentMethod === "vinti4" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
                                )}>
                                    <input type="radio" value="vinti4" checked={paymentMethod === "vinti4"} onChange={() => setPaymentMethod("vinti4")} className="sr-only" />
                                    {/* Usually we'd put a Vinti4 Logo here, using CreditCard temporarily */}
                                    <CreditCard className={cn("w-6 h-6", paymentMethod === "vinti4" ? "text-indigo-600" : "text-slate-400")} />
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">Vinti4 (SISP) - Cabo Verde</div>
                                        <div className="text-xs text-slate-500">Pague com Vinti4, Visa ou Mastercard</div>
                                    </div>
                                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === "vinti4" ? "border-indigo-500" : "border-slate-300")}>
                                        {paymentMethod === "vinti4" && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                                    </div>
                                </label>

                                <label className={cn(
                                    "flex items-center gap-4 border-2 rounded-xl p-4 cursor-pointer transition-all",
                                    paymentMethod === "card" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
                                )}>
                                    <input type="radio" value="card" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} className="sr-only" />
                                    <CreditCard className={cn("w-6 h-6", paymentMethod === "card" ? "text-indigo-600" : "text-slate-400")} />
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">Na entrega (TPA Móvel)</div>
                                        <div className="text-xs text-slate-500">O entregador levará a maquininha</div>
                                    </div>
                                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", paymentMethod === "card" ? "border-indigo-500" : "border-slate-300")}>
                                        {paymentMethod === "card" && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                                    </div>
                                </label>

                                <label className={cn(
                                    "flex items-center gap-4 border-2 rounded-xl p-4 transition-all relative overflow-hidden",
                                    orderMethod === "delivery" ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200" : "bg-white border-slate-200 cursor-pointer",
                                    paymentMethod === "cash" && orderMethod === "pickup" ? "border-indigo-500 bg-indigo-50" : ""
                                )}>
                                    <input type="radio" value="cash" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} disabled={orderMethod === "delivery"} className="sr-only" />
                                    <Banknote className={cn("w-6 h-6", paymentMethod === "cash" && orderMethod === "pickup" ? "text-indigo-600" : "text-slate-400")} />
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">Em Dinheiro</div>
                                        <div className="text-xs text-slate-500 line-clamp-1">{orderMethod === "delivery" ? "Indisponível para Delivery" : "Pague ao retirar na loja"}</div>
                                    </div>
                                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center relative", paymentMethod === "cash" && orderMethod === "pickup" ? "border-indigo-500" : "border-slate-300")}>
                                        {paymentMethod === "cash" && orderMethod === "pickup" && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                                    </div>
                                </label>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                                </>
                            ) : (
                                `Finalizar Pedido • ${formatCurrency(totalAmount)}`
                            )}
                        </button>
                        <p className="text-[10px] text-slate-400 text-center mt-3 px-4">
                            Ao finalizar o pedido declaras ter lido e aceite os <a href="/termos" target="_blank" className="underline hover:text-slate-600 leading-relaxed">Termos e Condições (SISP/DNRE)</a> e a <a href="/privacidade" target="_blank" className="underline hover:text-slate-600">Política de Privacidade</a> da Dineo.
                        </p>
                    </form>
                )}
            </main>
        </div>
    );
}
