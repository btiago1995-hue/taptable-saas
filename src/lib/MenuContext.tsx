"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    status: "available" | "sold_out";
    category: string;
    description?: string;
    imageUrl?: string;
}

interface MenuContextType {
    items: MenuItem[];
    categories: string[];
    setItems: (items: MenuItem[]) => void;
    setCategories: (categories: string[]) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const [items, setItemsState] = useState<MenuItem[]>([]);
    const [categories, setCategoriesState] = useState<string[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [restaurantId, setRestaurantId] = useState<string | null>(null);

    // 1. Resolve Active Tenant ID (from Auth or URL)
    useEffect(() => {
        let activeId = user?.restaurantId || null;

        // If not logged in, but visiting a public menu link
        if (!activeId && pathname?.includes("/p/")) {
            const parts = pathname.split("/");
            const pIndex = parts.indexOf("p");
            if (pIndex !== -1 && parts.length > pIndex + 1) {
                // Extracts the UUID representing the restaurant in MVP
                // URL example: /p/123e4567-e89b-12d3-a456-426614174000/delivery
                activeId = parts[pIndex + 1];
            }
        }

        if (activeId !== restaurantId) {
            setRestaurantId(activeId);
            setIsLoaded(false); // Reset load state when switching tenants
        }
    }, [user?.restaurantId, pathname, restaurantId]);

    // 2. Fetch data when Tenant ID is resolved
    useEffect(() => {
        const loadMenu = async () => {
            if (!restaurantId) {
                setItemsState([]);
                setCategoriesState([]);
                setIsLoaded(true);
                return;
            }

            try {
                // Fetch categories
                const { data: catNodes, error: catErr } = await supabase
                    .from('menu_categories')
                    .select('id, name, sort_order, restaurant_id')
                    .eq('restaurant_id', restaurantId)
                    .order('sort_order', { ascending: true });

                if (catErr) throw catErr;

                if (catNodes) {
                    setCategoriesState(catNodes.map(c => c.name));
                }

                // Fetch items — ordered by category sort for consistency
                const { data: dbItems, error: itemsErr } = await supabase
                    .from('menu_items')
                    .select('id, name, description, price, status, image_url, track_stock, stock_quantity, menu_categories(name, sort_order)')
                    .eq('restaurant_id', restaurantId)
                    .neq('status', 'hidden')
                    .order('name', { ascending: true });

                if (itemsErr) throw itemsErr;

                if (dbItems) {
                    const formatted: MenuItem[] = dbItems.map(i => ({
                        id: i.id,
                        name: i.name,
                        price: i.price,
                        status: i.status as any,
                        category: (Array.isArray(i.menu_categories) ? i.menu_categories[0]?.name : (i.menu_categories as any)?.name) || '',
                        description: i.description || '',
                        imageUrl: i.image_url || ''
                    }));
                    setItemsState(formatted);
                }
            } catch (err) {
                console.error("Failed to load menu from Supabase for tenant", restaurantId, err);
            } finally {
                setIsLoaded(true);
            }
        };

        loadMenu();

    }, [restaurantId]);

    const setCategories = async (newCategories: string[]) => {
        setCategoriesState(newCategories);
        if (!restaurantId) return;

        try {
            const { data: existing } = await supabase.from('menu_categories').select('id, name').eq('restaurant_id', restaurantId);

            for (let i = 0; i < newCategories.length; i++) {
                const name = newCategories[i];
                const exists = existing?.find(e => e.name === name);
                if (exists) {
                    await supabase.from('menu_categories').update({ sort_order: i }).eq('id', exists.id);
                } else {
                    await supabase.from('menu_categories').insert([{ restaurant_id: restaurantId, name, sort_order: i }]);
                }
            }

            const toDelete = existing?.filter(e => !newCategories.includes(e.name));
            if (toDelete && toDelete.length > 0) {
                const ids = toDelete.map(d => d.id);
                await supabase.from('menu_categories').delete().in('id', ids);
            }
        } catch (err) {
            console.error("Error saving categories to DB", err);
        }
    };

    const setItems = async (newItems: MenuItem[]) => {
        setItemsState(newItems);
        if (!restaurantId) return;

        try {
            const { data: dbCats } = await supabase.from('menu_categories').select('id, name').eq('restaurant_id', restaurantId);
            if (!dbCats) return;

            const upsertData = newItems.map(item => {
                const cId = dbCats.find(c => c.name === item.category)?.id;
                // Use a valid UUID if it already exists from DB, otherwise generate new one.
                const validId = item.id.includes('-') ? item.id : crypto.randomUUID();

                return {
                    id: validId,
                    restaurant_id: restaurantId,
                    category_id: cId,
                    name: item.name,
                    price: item.price,
                    status: item.status,
                    description: item.description,
                    image_url: item.imageUrl
                };
            });

            if (upsertData.length > 0) {
                await supabase.from('menu_items').upsert(upsertData);
            }

            const { data: currentDbItems } = await supabase.from('menu_items').select('id').eq('restaurant_id', restaurantId);
            if (currentDbItems) {
                const newItemIds = upsertData.map(d => d.id);
                const toDelete = currentDbItems.filter(dbI => !newItemIds.includes(dbI.id));
                if (toDelete.length > 0) {
                    await supabase.from('menu_items').delete().in('id', toDelete.map(d => d.id));
                }
            }
        } catch (err) {
            console.error("Error saving items to DB", err);
        }
    };

    // Do NOT return null here — renders loading state while menu is fetching
    // The DigitalMenu component handles the empty state gracefully

    return (
        <MenuContext.Provider value={{ items, categories, setItems, setCategories }}>
            {children}
        </MenuContext.Provider>
    );
}

export function useMenu() {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error("useMenu must be used within a MenuProvider");
    }
    return context;
}
