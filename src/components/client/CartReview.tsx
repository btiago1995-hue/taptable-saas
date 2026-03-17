"use client";

import { useCart } from "@/lib/CartContext";
import { formatCurrency } from "@/lib/utils";
import { X, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface CartReviewProps {
    isOpen: boolean;
    onClose: () => void;
    checkoutUrl: string;
}

export function CartReview({ isOpen, onClose, checkoutUrl }: CartReviewProps) {
    const { cartItems, addToCart, removeFromCart, cartTotal, cartItemCount } = useCart();
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] h-[85vh] sm:h-auto max-h-[90vh] flex flex-col shadow-2xl relative animate-in slide-in-from-bottom-8 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Seu Pedido</h3>
                            <p className="text-xs font-medium text-slate-500">{cartItemCount} {cartItemCount === 1 ? 'item selecionado' : 'itens selecionados'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <ShoppingBag className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-slate-500 font-medium">Seu carrinho está vazio.</p>
                            <button onClick={onClose} className="mt-4 text-indigo-600 font-bold">Voltar ao menu</button>
                        </div>
                    ) : (
                        cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center group animate-in fade-in slide-in-from-left-2 transition-all">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                                    <p className="text-sm font-bold text-indigo-600">{formatCurrency(item.price * (item.quantity || 1))}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => removeFromCart(item.id)}
                                        className="w-8 h-8 flex items-center justify-center bg-white text-slate-600 rounded-lg shadow-sm hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-black text-slate-900 w-5 text-center text-sm">
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => addToCart(item)}
                                        className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 sm:rounded-b-[2rem]">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-xs">Total do Pedido</span>
                        <span className="text-2xl font-black text-slate-900">{formatCurrency(cartTotal)}</span>
                    </div>

                    <button 
                        onClick={() => router.push(checkoutUrl)}
                        disabled={cartItems.length === 0}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                    >
                        Continuar para Checkout
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-medium mt-4 uppercase tracking-[0.2em]">
                        Pague no balcão ou via cartão no próximo passo
                    </p>
                </div>
            </div>
        </div>
    );
}
