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
    if (!confirm(`Tem certeza que deseja ${currentStatus ? 'BLOQUEAR' : 'DESBLOQUEAR'} o acesso deste restaurante ao Dineo?`)) return;

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
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-slate-900" />
        <p className="font-medium">Carregando ecossistema Dineo...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-200 flex items-center px-8 shrink-0 bg-white sticky top-0 z-10 w-full shadow-sm">
         <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Superadmin
         </h1>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 w-full">
        <div className="max-w-7xl mx-auto space-y-10">
            
            {/* Header Title for Content */}
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Visão de Águia</h2>
              <p className="text-slate-500 font-medium text-lg">Métricas e gestão do ecossistema de retalho e restauração.</p>
            </div>

            {/* Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Lojas Ativas */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs mb-3 uppercase tracking-widest">Lojas Ativas</p>
                            <h3 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-none">
                                {activeCount} <span className="text-slate-400 text-2xl font-bold">/ {restaurants.length}</span>
                            </h3>
                        </div>
                    </div>
                </div>

                {/* MRR */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs mb-3 uppercase tracking-widest">Receita Recorrente</p>
                            <h3 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-none">
                              {formatCurrency(estimatedMRR).replace(',00', '')}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* GMV Global */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs mb-3 uppercase tracking-widest">GMV Total</p>
                            <h3 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-none">
                              {formatCurrency(totalGMV).replace(',00', '')}
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-slate-400 font-bold text-[10px] sm:text-xs mb-3 uppercase tracking-widest">Volume (Pedidos)</p>
                            <h3 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-none">
                              {totalVolume}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tenant Table */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-black tracking-tight text-slate-900">Ecossistema de Lojas</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                <th className="px-8 py-4">Restaurante</th>
                                <th className="px-8 py-4">Criado em</th>
                                <th className="px-8 py-4 text-center">Pedidos</th>
                                <th className="px-8 py-4 text-right">GMV Loja</th>
                                <th className="px-8 py-4">Plano SaaS</th>
                                <th className="px-8 py-4">Acesso</th>
                                <th className="px-8 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {restaurants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-8 py-16 text-center text-slate-500 font-medium">
                                        Nenhum restaurante cadastrado no momento.
                                    </td>
                                </tr>
                            ) : (
                                restaurants.map((restaurant, idx) => (
                                    <tr key={restaurant.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                                                {idx === 0 && restaurant.gmv! > 0 && <span className="text-lg leading-none">🏆</span>}
                                                {restaurant.name}
                                            </div>
                                            <a href={`/p/${restaurant.slug}`} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-indigo-600 font-medium text-xs mt-1 block transition-colors">
                                                /{restaurant.slug}
                                            </a>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-medium text-slate-600">
                                            {new Date(restaurant.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-md text-sm border border-slate-200">
                                                {restaurant.total_orders || 0}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-slate-900">
                                            {formatCurrency(restaurant.gmv || 0)}
                                        </td>
                                        <td className="px-8 py-5">
                                            <select
                                                disabled={isToggling === restaurant.id}
                                                value={restaurant.subscription_plan || 'growth'}
                                                onChange={(e) => changeSubscriptionPlan(restaurant.id, e.target.value)}
                                                className="bg-white border border-slate-200 text-slate-700 font-medium text-sm rounded-xl focus:ring-slate-900 focus:border-slate-900 block w-full p-2.5 outline-none shadow-sm"
                                            >
                                                <option value="essencial">Essencial (1.990 CVE)</option>
                                                <option value="growth">Growth (4.990 CVE)</option>
                                                <option value="elite">Elite (9.900 CVE)</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-5">
                                            {restaurant.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    Ativo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                                                    Bloqueado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                disabled={isToggling === restaurant.id}
                                                onClick={() => toggleRestaurantAccess(restaurant.id, restaurant.is_active)}
                                                className={cn(
                                                    "px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[150px] ml-auto border",
                                                    restaurant.is_active 
                                                        ? "bg-white text-rose-600 border-slate-200 hover:border-rose-200 hover:bg-rose-50" 
                                                        : "bg-slate-900 text-white border-transparent hover:bg-slate-800"
                                                )}
                                            >
                                                {isToggling === restaurant.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : restaurant.is_active ? (
                                                    "Suspender Loja"
                                                ) : (
                                                    "Restaurar Loja"
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
