"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Minus, X, UtensilsCrossed, ReceiptText, Banknote, Store, Loader2, PenSquare } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useOrders } from "@/lib/OrderContext";
import { formatCurrency, cn } from "@/lib/utils";

interface WaiterPOSProps {
    restaurantId: string;
}

export function WaiterPOS({ restaurantId }: WaiterPOSProps) {
    const { placeOrder } = useOrders();
    const [isOpen, setIsOpen] = useState(false);
    
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>("");
    
    // Local Cart State
    const [cart, setCart] = useState<{ id: string, name: string, price: number, quantity: number }[]>([]);
    const [tableNumber, setTableNumber] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingMenu, setIsLoadingMenu] = useState(false);

    // Fetch Menu when drawer opens
    useEffect(() => {
        if (isOpen && categories.length === 0) {
            const fetchMenu = async () => {
                setIsLoadingMenu(true);
                try {
                    const [catsRes, itemsRes] = await Promise.all([
                        supabase.from('menu_categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
                        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('status', 'available')
                    ]);
                    
                    if (catsRes.data) {
                        setCategories(catsRes.data);
                        if (catsRes.data.length > 0) setActiveCategory(catsRes.data[0].id);
                    }
                    if (itemsRes.data) setItems(itemsRes.data);
                } catch (error) {
                    console.error("Error fetching menu", error);
                } finally {
                    setIsLoadingMenu(false);
                }
            };
            fetchMenu();
        }
    }, [isOpen, restaurantId, categories.length]);

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [cart]);

    const filteredItems = useMemo(() => {
        return items.filter(item => item.category_id === activeCategory);
    }, [items, activeCategory]);

    const addToCart = (item: any) => {
        setCart(current => {
            const existing = current.find(c => c.id === item.id);
            if (existing) {
                return current.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...current, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(current => {
            const existing = current.find(c => c.id === itemId);
            if (existing && existing.quantity > 1) {
                return current.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
            }
            return current.filter(c => c.id !== itemId);
        });
    };

    const getQuantity = (itemId: string) => {
        return cart.find(c => c.id === itemId)?.quantity || 0;
    };

    const handleSubmitOrder = async (paymentOption: 'pending' | 'cash' | 'vinti4') => {
        if (cart.length === 0) return alert("O carrinho está vazio.");
        if (!tableNumber || isNaN(Number(tableNumber)) || Number(tableNumber) <= 0) {
            return alert("Insira um número de mesa válido.");
        }

        setIsSubmitting(true);
        try {
            const status = 'preparing'; // Vai direto para a cozinha
            const payStatus = paymentOption === 'pending' ? 'pending' : 'paid';
            const method = paymentOption === 'pending' ? 'in_store' : paymentOption; // pending isn't a method, but in_store handles it usually

            await placeOrder(
                restaurantId,
                Number(tableNumber),
                cart.map(c => ({ id: c.id, name: c.name, price: c.price, quantity: c.quantity })),
                cartTotal,
                0, // No tip from Waiter app usually, or hardcoded
                method as any,
                payStatus as any,
                'in_store'
            );
            
            // Sucesso!
            setCart([]);
            setTableNumber("");
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to place order:", error);
            alert("Erro ao lançar o pedido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-indigo-700 hover:scale-105 transition-all z-40 group border-4 border-white"
                aria-label="Abrir Mini-POS"
            >
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    POS
                </div>
                <PenSquare className="w-7 h-7" />
            </button>

            {/* Modal / Drawer Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
                    {/* Drawer Content */}
                    <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 overflow-hidden">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                    <UtensilsCrossed className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-lg leading-tight">Mini-POS Garçom</h2>
                                    <p className="text-xs text-slate-500 font-medium tracking-wide">Lançar pedido de redundância</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Layout Split: Menu (Left/Top) | Cart (Right/Bottom) */}
                        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-slate-50">
                            
                            {/* Left: Product Selection */}
                            <div className="flex-1 overflow-y-auto border-r border-slate-100 flex flex-col">
                                {/* Categories */}
                                <div className="flex overflow-x-auto gap-2 p-3 bg-white border-b border-slate-100 no-scrollbar pb-3">
                                    {categories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors",
                                                activeCategory === cat.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Items List */}
                                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                                    {isLoadingMenu && <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500"/></div>}
                                    
                                    {!isLoadingMenu && filteredItems.map(item => {
                                        const qty = getQuantity(item.id);
                                        return (
                                            <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm hover:border-indigo-200 transition-colors">
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                                                    <p className="text-indigo-600 font-bold text-sm">{formatCurrency(item.price)}</p>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-200 p-1">
                                                    <button 
                                                        onClick={() => removeFromCart(item.id)}
                                                        disabled={qty === 0}
                                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-700 shadow-sm border border-slate-200 disabled:opacity-30 active:scale-95"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-4 font-bold text-center text-slate-800 text-sm">{qty}</span>
                                                    <button 
                                                        onClick={() => addToCart(item)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm border border-indigo-700 active:scale-95"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: Cart & Checkout */}
                            <div className="w-full sm:w-[320px] bg-white border-t sm:border-t-0 flex flex-col sm:max-h-full max-h-[45vh] shadow-[0_-10px_20px_rgba(0,0,0,0.05)] sm:shadow-none z-10">
                                
                                {/* Items Summary */}
                                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Resumo do Pedido</h3>
                                    {cart.length === 0 ? (
                                        <div className="text-center p-6 text-slate-400 text-sm">Nenhum item adicionado.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {cart.map(c => (
                                                <div key={c.id} className="flex justify-between text-sm items-start">
                                                    <div className="flex-1 pr-2">
                                                        <span className="font-bold text-slate-800">{c.quantity}x</span> {c.name}
                                                    </div>
                                                    <span className="font-semibold text-slate-600">{formatCurrency(c.price * c.quantity)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Checkout Actions */}
                                <div className="p-4 bg-white border-t border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-bold text-slate-600 text-sm">Total a pagar:</span>
                                        <span className="font-black text-2xl text-slate-900">{formatCurrency(cartTotal)}</span>
                                    </div>

                                    {/* Table Assignment */}
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1.5"><Store className="w-3 h-3"/> Associar à Mesa N.º</label>
                                        <input 
                                            type="number" 
                                            value={tableNumber} 
                                            onChange={e => setTableNumber(e.target.value)}
                                            placeholder="Ex: 5"
                                            className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 font-bold text-xl text-slate-800 text-center focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        />
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="space-y-2">
                                        {/* Default: Pagar no final */}
                                        <button 
                                            disabled={isSubmitting || cart.length === 0 || !tableNumber}
                                            onClick={() => handleSubmitOrder('pending')}
                                            className="w-full bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ReceiptText className="w-5 h-5"/>}
                                            Enviar p/ Cozinha (Pagar Fim)
                                        </button>
                                        
                                        {/* Fast Payment Options */}
                                        <div className="flex gap-2">
                                            <button 
                                                disabled={isSubmitting || cart.length === 0 || !tableNumber}
                                                onClick={() => handleSubmitOrder('vinti4')}
                                                className="flex-1 bg-slate-900 text-white text-xs font-bold py-3 px-2 rounded-xl border border-slate-800 hover:bg-slate-800 active:scale-95 transition-all truncate disabled:opacity-50"
                                            >
                                                Pago no TPA
                                            </button>
                                            <button 
                                                disabled={isSubmitting || cart.length === 0 || !tableNumber}
                                                onClick={() => handleSubmitOrder('cash')}
                                                className="flex-1 bg-amber-500 text-amber-950 text-xs font-bold py-3 px-2 rounded-xl flex items-center justify-center gap-1 hover:bg-amber-400 active:scale-95 transition-all truncate disabled:opacity-50 border border-amber-600/20 shadow-sm"
                                            >
                                                <Banknote className="w-3 h-3"/> Pago Dinheiro
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
