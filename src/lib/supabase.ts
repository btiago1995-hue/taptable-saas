/**
 * supabase.ts — Clientes Supabase com diferentes níveis de acesso
 *
 * supabasePublic: usa ANON_KEY — respeita RLS — para operações do cliente e staff
 * supabaseAdmin:  usa SERVICE_ROLE_KEY — bypassa RLS — apenas para API routes seguras
 *
 * NUNCA exponha supabaseAdmin no frontend (use apenas em /api/*)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Cliente Público (com RLS) ─────────────────────────────────────────────
// Para uso no frontend e em operações normais de staff autenticado.
// Todas as queries respeitam as políticas RLS.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

// ─── Cliente Admin (sem RLS — server-side only!) ───────────────────────────
// APENAS para uso em API routes Next.js (server-side).
// Bypassa o RLS — permite operações cross-tenant para superadmin e sync offline.
// NUNCA usar em componentes React ou pages do lado do cliente.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── Tipos legacy (mantidos para retrocompatibilidade) ────────────────────
export type TableStatus = "available" | "occupied" | "payment_pending";

export interface Restaurant {
    id: string;
    name: string;
    logo: string;
    defaultTipPercentage: number;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface TableBill {
    id: string;
    restaurantId: string;
    tableNumber: number;
    items: MenuItem[];
    subtotal: number;
    status: TableStatus;
}

export interface DigitalMenuItem {
    id: string;
    categoryId: string;
    name: string;
    description: string;
    price: number;
    image: string;
    isAvailable: boolean;
}

export interface MenuCategory {
    id: string;
    name: string;
    items: DigitalMenuItem[];
}
