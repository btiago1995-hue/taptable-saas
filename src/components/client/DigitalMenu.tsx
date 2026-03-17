"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Minus, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/lib/CartContext";
import { useMenu } from "@/lib/MenuContext";
import Image from "next/image";

export function DigitalMenu() {
    // Ensure useMenu provides all items and categories
    const { items: allMenuItems, categories } = useMenu();
    const [activeCategory, setActiveCategory] = useState(categories?.[0] || "");
    const { cartItems, addToCart, removeFromCart } = useCart();

    // Sync active category if the global categories list updates and we're missing it
    useEffect(() => {
        if (!activeCategory && categories?.length > 0) {
            setActiveCategory(categories[0]);
        }
    }, [activeCategory, categories]);

    const visibleItems = useMemo(() => {
        if (!allMenuItems || !activeCategory) return [];
        return allMenuItems.filter(item => item.category === activeCategory);
    }, [allMenuItems, activeCategory]);

    if (!categories || categories.length === 0 || !allMenuItems) return null;

    return (
        <div className="mb-8">
            {/* Category Navigation */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 no-scrollbar">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeCategory === category
                            ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-105"
                            : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Active Category Items */}
            <div className="space-y-4">
                {visibleItems.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                        Nenhum prato nesta categoria ainda.
                    </div>
                )}
                {visibleItems.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 transition-transform hover:-translate-y-1">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center relative shadow-inner group">
                            {item.imageUrl ? (
                                <Image 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    fill 
                                    className="object-cover transition-transform duration-500 group-hover:scale-110" 
                                    sizes="96px"
                                />
                            ) : (
                                <div className="text-slate-300 font-bold text-3xl opacity-50">🍲</div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-slate-900 leading-tight mb-1">{item.name}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2">{item.description || "Delicioso prato preparado com muito carinho."}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="font-bold text-primary-700">{formatCurrency(item.price)}</span>
                                {item.status === "available" ? (
                                    <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-sm rounded-xl p-1 border border-slate-200/50">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="bg-white text-slate-700 w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-sm hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-90"
                                            aria-label="Remover"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="font-black text-slate-900 text-sm w-7 text-center">
                                            {cartItems.find(c => c.id === item.id)?.quantity || 0}
                                        </span>
                                        <button
                                            onClick={() => addToCart({ id: item.id, name: item.name, price: item.price, quantity: 1 })}
                                            className="bg-slate-900 text-white w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shadow-sm hover:bg-indigo-600 transition-colors active:scale-90"
                                            aria-label="Adicionar"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                                        Esgotado
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
