"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, cn } from "@/lib/utils";
import { Store, ShieldCheck, ShieldAlert, BadgeDollarSign, Activity, Users, Loader2, TrendingUp, ShoppingBag } from "lucide-react";

interface TenantRestaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  total_orders?: number;
  gmv?: number;
  subscription_plan?: string;
}

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<TenantRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // Hardcoded SaaS pricing for demonstration (e.g., 4000 CVE/month)
  const MONTHLY_LICENSE_FEE = 4000;

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      // Fetch all restaurants
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('*');

      if (restError) throw restError;
      
      // Fetch all paid orders to compute GMV and Volume
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('restaurant_id, total')
        .eq('payment_status', 'paid');
        
      if (orderError) throw orderError;

      // Group orders by restaurant
      const orderStats = (orderData || []).reduce((acc: any, order: any) => {
        if (!acc[order.restaurant_id]) {
            acc[order.restaurant_id] = { count: 0, gmv: 0 };
        }
        acc[order.restaurant_id].count += 1;
        acc[order.restaurant_id].gmv += Number(order.total) || 0;
        return acc;
      }, {});

      // Enrich restaurants with stats
      const enrichedRestaurants = (restData || []).map(r => ({
          ...r,
          total_orders: orderStats[r.id]?.count || 0,
          gmv: orderStats[r.id]?.gmv || 0
      }));

      // Sort by GMV descending (Leaderboard) before creation date fallback
      enrichedRestaurants.sort((a, b) => b.gmv - a.gmv || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRestaurants(enrichedRestaurants);
    } catch (err) {
      console.error("Error loading tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCount = restaurants.filter(r => r.is_active).length;
  const estimatedMRR = activeCount * MONTHLY_LICENSE_FEE;
  const totalGMV = restaurants.reduce((sum, r) => sum + (r.gmv || 0), 0);
  const totalVolume = restaurants.reduce((sum, r) => sum + (r.total_orders || 0), 0);

  const toggleRestaurantAccess = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Tem certeza que deseja ${currentStatus ? 'BLOQUEAR' : 'DESBLOQUEAR'} o acesso deste restaurante ao TapTable?`)) return;

    try {
      setIsToggling(id);
      const { error } = await supabase
        .from('restaurants')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh local state without refetching everything
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
    } catch (err: any) {
      alert("Erro ao alterar o status do restaurante: " + err.message);
    } finally {
      setIsToggling(null);
    }
  };

  const changeSubscriptionPlan = async (id: string, newPlan: string) => {
    try {
      setIsToggling(id);
      const { error } = await supabase
        .from('restaurants')
        .update({ subscription_plan: newPlan })
        .eq('id', id);

      if (error) throw error;
      
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, subscription_plan: newPlan } : r));
    } catch (err: any) {
      alert("Erro ao alterar o plano: " + err.message);
    } finally {
      setIsToggling(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
        <p>Carregando ecossistema TapTable...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-200">
      
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center px-8 shrink-0 bg-slate-900/50 backdrop-blur-sm relative z-10 w-full">
         <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" /> Visão de Águia
         </h1>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-8 w-full">
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Ativas */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">Lojas Ativas</p>
                            <h3 className="text-4xl font-black text-white">
                                {activeCount} <span className="text-slate-600 text-2xl font-medium">/ {restaurants.length}</span>
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Store className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* MRR */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">MRR (SaaS)</p>
                            <h3 className="text-3xl font-black text-white">{formatCurrency(estimatedMRR)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <BadgeDollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* GMV Global */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">GMV Transacionado</p>
                            <h3 className="text-3xl font-black text-white">{formatCurrency(totalGMV)}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">Volume de Pedidos</p>
                            <h3 className="text-4xl font-black text-white">{totalVolume}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tenant Table */}
            <div className="bg-slate-800/30 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Ecossistema de Restaurantes</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-white/5 text-slate-400 text-sm">
                                <th className="px-6 py-4 font-semibold">Restaurante / URL</th>
                                <th className="px-6 py-4 font-semibold">Data de Adesão</th>
                                <th className="px-6 py-4 font-semibold text-center">Pedidos</th>
                                <th className="px-6 py-4 font-semibold text-right">GMV (Faturamento da Loja)</th>
                                <th className="px-6 py-4 font-semibold">Plano SaaS</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Ação Administrativa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {restaurants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                                        Nenhum restaurante cadastrado no momento.
                                    </td>
                                </tr>
                            ) : (
                                restaurants.map((restaurant, idx) => (
                                    <tr key={restaurant.id} className="border-b border-white/5 hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white flex items-center gap-2">
                                                {idx === 0 && restaurant.gmv! > 0 && <span className="text-xl">🏆</span>}
                                                {restaurant.name}
                                            </div>
                                            <a href={`/p/${restaurant.slug}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-mono text-xs mt-1 block transition-colors">
                                                /{restaurant.slug}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-400">
                                            {new Date(restaurant.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center bg-slate-800 text-slate-300 font-bold px-3 py-1 rounded-lg text-sm">
                                                {restaurant.total_orders || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-400">
                                            {formatCurrency(restaurant.gmv || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                disabled={isToggling === restaurant.id}
                                                value={restaurant.subscription_plan || 'growth'}
                                                onChange={(e) => changeSubscriptionPlan(restaurant.id, e.target.value)}
                                                className="bg-slate-900 border border-white/10 text-slate-300 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 outline-none"
                                            >
                                                <option value="essencial">Essencial (1.990 CVE)</option>
                                                <option value="growth">Growth (4.990 CVE)</option>
                                                <option value="elite">Elite (9.900 CVE)</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            {restaurant.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <ShieldCheck className="w-3.5 h-3.5" /> Ativo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                                    <ShieldAlert className="w-3.5 h-3.5" /> Inadimplente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                disabled={isToggling === restaurant.id}
                                                onClick={() => toggleRestaurantAccess(restaurant.id, restaurant.is_active)}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px] ml-auto",
                                                    restaurant.is_active 
                                                        ? "text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20" 
                                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                                )}
                                            >
                                                {isToggling === restaurant.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : restaurant.is_active ? (
                                                    "Suspender Acesso"
                                                ) : (
                                                    "Restaurar Acesso"
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
