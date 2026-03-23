"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "./supabaseClient";

export type UserRole = "manager" | "waiter" | "kitchen" | "driver" | "superadmin";

export interface RestaurantOption {
    id: string;
    name: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    restaurantId: string;
    restaurantName?: string;
    restaurantData?: {
        name?: string;
        nif?: string;
        address?: string;
        vinti4PosId?: string;
        vinti4PosAutCode?: string;
        subscriptionPlan?: string;
        subscriptionBilling?: string;
        subscriptionExpiresAt?: string;
        subscriptionStatus?: string;
    };
    subscriptionPlan?: string;
    subscriptionExpiresAt?: string;
    subscriptionStatus?: string;
    isRestaurantActive: boolean;
    accessModules: string[];
    availableRestaurants: RestaurantOption[];
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    logout: () => Promise<void>;
    switchRestaurant: (restaurantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const loadUserAndProfile = useCallback(async (sessionUser: any) => {
        if (!sessionUser) {
            setUser(null);
            setIsLoaded(true);
            return;
        }

        try {
            const { data: profile } = await supabase
                .from('users')
                .select('*, restaurants(name, is_active, nif_number, address, vinti4_pos_id, vinti4_pos_aut_code, subscription_plan, subscription_billing, subscription_expires_at, subscription_status)')
                .eq('id', sessionUser.id)
                .single();

            if (!profile) {
                setUser(null);
                return;
            }

            // Fetch all restaurants this user can access
            const { data: accessRows } = await supabase
                .from('user_restaurant_access')
                .select('restaurant_id, restaurants(id, name)')
                .eq('user_id', sessionUser.id);

            const availableRestaurants: RestaurantOption[] = (accessRows || [])
                .map((row: any) => ({
                    id: row.restaurants?.id || row.restaurant_id,
                    name: row.restaurants?.name || "Restaurante",
                }))
                .filter((r: RestaurantOption) => r.id);

            // Ensure current restaurant is always in the list
            if (
                profile.restaurant_id &&
                !availableRestaurants.find(r => r.id === profile.restaurant_id)
            ) {
                availableRestaurants.unshift({
                    id: profile.restaurant_id,
                    name: profile.restaurants?.name || "Restaurante",
                });
            }

            setUser({
                id: sessionUser.id,
                email: sessionUser.email,
                name: profile.name,
                role: profile.role as UserRole,
                restaurantId: profile.restaurant_id,
                restaurantName: profile.restaurants?.name || "Meu Restaurante",
                restaurantData: {
                    name: profile.restaurants?.name,
                    nif: profile.restaurants?.nif_number,
                    address: profile.restaurants?.address,
                    vinti4PosId: profile.restaurants?.vinti4_pos_id,
                    vinti4PosAutCode: profile.restaurants?.vinti4_pos_aut_code,
                    subscriptionPlan: profile.restaurants?.subscription_plan || 'starter',
                    subscriptionBilling: profile.restaurants?.subscription_billing || 'monthly',
                    subscriptionExpiresAt: profile.restaurants?.subscription_expires_at,
                    subscriptionStatus: profile.restaurants?.subscription_status || 'trial',
                },
                subscriptionPlan: profile.restaurants?.subscription_plan || 'starter',
                subscriptionExpiresAt: profile.restaurants?.subscription_expires_at || undefined,
                subscriptionStatus: profile.restaurants?.subscription_status || 'trial',
                isRestaurantActive: profile.restaurants?.is_active ?? true,
                accessModules: profile.access_modules || [],
                availableRestaurants,
            });
        } catch (err) {
            console.error("Error fetching user profile:", err);
            setUser(null);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await loadUserAndProfile(session?.user);

            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (_event, session) => {
                    await loadUserAndProfile(session?.user);
                }
            );

            return () => subscription.unsubscribe();
        };

        initializeAuth();
    }, [loadUserAndProfile]);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const switchRestaurant = async (restaurantId: string) => {
        if (!user || restaurantId === user.restaurantId) return;

        // Optimistically update name from available list
        const target = user.availableRestaurants.find(r => r.id === restaurantId);
        if (target) {
            setUser(prev => prev ? { ...prev, restaurantId, restaurantName: target.name } : prev);
        }

        // Persist switch in DB so all API routes pick it up
        await supabase
            .from('users')
            .update({ restaurant_id: restaurantId })
            .eq('id', user.id);

        // Reload full profile with new restaurant data
        const { data: { session } } = await supabase.auth.getSession();
        await loadUserAndProfile(session?.user);
    };

    if (!isLoaded) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                <p className="text-sm text-slate-400 font-medium">A carregar...</p>
            </div>
        </div>
    );

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading: !isLoaded, logout, switchRestaurant }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
