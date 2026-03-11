"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "./supabaseClient";

export type UserRole = "manager" | "waiter" | "kitchen";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    restaurantId: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadUserAndProfile = async (sessionUser: any) => {
            if (!sessionUser) {
                setUser(null);
                setIsLoaded(true);
                return;
            }

            try {
                // Fetch custom profile linked to the Supabase Auth User
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*, restaurants(name)')
                    .eq('id', sessionUser.id)
                    .single();

                if (profile) {
                    setUser({
                        id: sessionUser.id,
                        email: sessionUser.email,
                        name: profile.name,
                        role: profile.role as UserRole,
                        restaurantId: profile.restaurant_id
                    });
                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
                setUser(null);
            } finally {
                setIsLoaded(true);
            }
        };

        const initializeAuth = async () => {
            // Get initial session
            const { data: { session } } = await supabase.auth.getSession();
            await loadUserAndProfile(session?.user);

            // Listen for auth state changes (login, logout, token refresh)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                async (_event, session) => {
                    await loadUserAndProfile(session?.user);
                }
            );

            return () => subscription.unsubscribe();
        };

        initializeAuth();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    // Prevent hydration mismatch and ensure we don't render protected routes until we check the session
    if (!isLoaded) return null;

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, logout }}>
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
