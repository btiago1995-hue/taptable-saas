"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { MenuItem } from "@/lib/supabase";

interface CartContextType {
    cartItems: MenuItem[];
    addToCart: (item: MenuItem) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    cartTotal: number;
    cartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cartItems, setCartItems] = useState<MenuItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("taptable_cart");
            if (stored) {
                setCartItems(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load cart", e);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("taptable_cart", JSON.stringify(cartItems));
        }
    }, [cartItems, isLoaded]);

    const addToCart = (newItem: MenuItem) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === newItem.id);
            if (existingItem) {
                return prevItems.map((item) =>
                    item.id === newItem.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevItems, { ...newItem, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((item) => item.id === itemId);
            if (existingItem?.quantity === 1) {
                return prevItems.filter((item) => item.id !== itemId);
            }
            return prevItems.map((item) =>
                item.id === itemId
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
            );
        });
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const cartItemCount = cartItems.reduce(
        (count, item) => count + item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                clearCart,
                cartTotal,
                cartItemCount,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
