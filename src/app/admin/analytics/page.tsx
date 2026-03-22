"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, cn } from "@/lib/utils";
import {
    Clock,
    TrendingUp,
    ShoppingBag,
    Banknote,
    CalendarDays,
    BarChart3,
    Utensils,
    Truck,
    Store,
    Smartphone,
    TrendingDown,
    Loader2
} from "lucide-react";

interface AnalyticsData {
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
    totalOrders: number;
    averageTicket: number;
    ordersByOrigin: { in_store: number; delivery: number; pickup: number; };
    busiestHours: { hour: string; count: number; }[];
    topItems: { name: string; quantity: number; revenue: number; }[];
}

export default function AnalyticsDashboard() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<"hoje" | "semana" | "mes">("mes");
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        if (!user?.restaurantId) return;

        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                // Determine Date Range
                const now = new Date();
                let startDate = new Date();
                
                if (period === "hoje") {
                    startDate.setHours(0, 0, 0, 0);
                } else if (period === "semana") {
                    const day = startDate.getDay();
                    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Monday
                    startDate = new Date(startDate.setDate(diff));
                    startDate.setHours(0, 0, 0, 0);
                } else if (period === "mes") {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    startDate.setHours(0, 0, 0, 0);
                }

                // 1. Fetch Paid Orders
                const { data: orders, error: ordersErr } = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('restaurant_id', user.restaurantId)
                    .eq('payment_status', 'paid')
                    .gte('created_at', startDate.toISOString());

                if (ordersErr) throw ordersErr;

                // 2. Fetch Refunds (Credit Notes) — gracefully handle if table doesn't exist yet
                const { data: creditNotes } = await supabase
                    .from('credit_notes')
                    .select('value')
                    .eq('restaurant_id', user.restaurantId)
                    .gte('created_at', startDate.toISOString());
                // If error, creditNotes will be null — handled below as empty array

                // 3. Process Data
                const fetchedOrders = orders || [];
                const fetchedRefunds = creditNotes || [];

                let grossRevenue = 0;
                let origins = { in_store: 0, delivery: 0, pickup: 0 };
                let hourlyCounts: Record<string, number> = {};
                let itemStats: Record<string, { quantity: number; revenue: number }> = {};

                fetchedOrders.forEach((o: any) => {
                    grossRevenue += Number(o.total_amount);

                    // Origins
                    if (o.order_type === 'in_store') origins.in_store++;
                    else if (o.order_type === 'delivery') origins.delivery++;
                    else if (o.order_type === 'pickup') origins.pickup++;

                    // Busiest Hours
                    const hour = new Date(o.created_at).getHours().toString().padStart(2, '0') + ':00';
                    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;

                    // Items
                    if (o.order_items) {
                        o.order_items.forEach((item: any) => {
                            if (!itemStats[item.name]) {
                                itemStats[item.name] = { quantity: 0, revenue: 0 };
                            }
                            itemStats[item.name].quantity += item.quantity;
                            itemStats[item.name].revenue += (item.price * item.quantity);
                        });
                    }
                });

                const totalRefunds = fetchedRefunds.reduce((sum, r) => sum + Number(r.value), 0);
                const netRevenue = grossRevenue - totalRefunds;

                // Formatting Hours
                const busiestHours = Object.keys(hourlyCounts).map(h => ({
                    hour: h,
                    count: hourlyCounts[h]
                })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

                // Formatting Top Items
                const topItems = Object.keys(itemStats).map(name => ({
                    name,
                    quantity: itemStats[name].quantity,
                    revenue: itemStats[name].revenue
                })).sort((a, b) => b.quantity - a.quantity).slice(0, 5); // top 5

                setStats({
                    totalRevenue: grossRevenue,
                    totalRefunds: totalRefunds,
                    netRevenue: netRevenue,
                    totalOrders: fetchedOrders.length,
                    averageTicket: fetchedOrders.length > 0 ? grossRevenue / fetchedOrders.length : 0,
                    ordersByOrigin: origins,
                    busiestHours: busiestHours,
                    topItems: topItems
                });

            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [user?.restaurantId, period]);

    if (isLoading || !stats) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary-500" />
                <p>Calculando Inteligência de Negócio...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Visão Geral de Desempenho</h1>
                    <p className="text-slate-500 font-medium">Acompanhe as métricas e o fluxo do restaurante.</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                    {[
                        { id: "hoje", label: "Hoje" },
                        { id: "semana", label: "Esta Semana" },
                        { id: "mes", label: "Este Mês" }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id as any)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                                period === p.id
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Net Revenue */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <Banknote className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Receita Líquida no Período</p>
                        <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.netRevenue)}</h3>
                        {stats.totalRefunds > 0 && (
                            <p className="text-xs font-semibold text-red-500 mt-2 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> {formatCurrency(stats.totalRefunds)} em estornos
                            </p>
                        )}
                    </div>
                </div>

                {/* Orders */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                            {period === 'hoje' ? 'Hoje' : period === 'semana' ? '7 dias' : '30 dias'}
                        </span>
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Total de Pedidos Pagos</p>
                        <h3 className="text-3xl font-black text-slate-900">{stats.totalOrders}</h3>
                    </div>
                </div>

                {/* Avg Ticket */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Ticket Médio (Faturamento / Pedido)</p>
                        <h3 className="text-3xl font-black text-slate-900">{formatCurrency(stats.averageTicket)}</h3>
                    </div>
                </div>

                {/* Service Time (Placeholder mapping to logic) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                            <Clock className="w-6 h-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            Padrão
                        </span>
                    </div>
                    <div>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Tempo de Serviço</p>
                        <h3 className="text-3xl font-black text-slate-900">—</h3>
                        <p className="text-xs text-slate-400 mt-1">Métrica disponível em breve</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Origins Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                            <Store className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Origem dos Pedidos</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50">
                                    <Store className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">Salão / QRCode</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 text-right">
                                {stats.totalOrders > 0 ? Math.round((stats.ordersByOrigin.in_store / stats.totalOrders) * 100) : 0}%
                                <div className="text-xs text-slate-500 font-semibold">{stats.ordersByOrigin.in_store} pedidos</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-orange-50 text-orange-600 shadow-sm border border-orange-100/50">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">Delivery</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 text-right">
                                {stats.totalOrders > 0 ? Math.round((stats.ordersByOrigin.delivery / stats.totalOrders) * 100) : 0}%
                                <div className="text-xs text-slate-500 font-semibold">{stats.ordersByOrigin.delivery} pedidos</div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 shadow-sm border border-purple-100/50">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">Retirada (Pickup)</div>
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 text-right">
                                {stats.totalOrders > 0 ? Math.round((stats.ordersByOrigin.pickup / stats.totalOrders) * 100) : 0}%
                                <div className="text-xs text-slate-500 font-semibold">{stats.ordersByOrigin.pickup} pedidos</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Busiest Hours Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Horários de Pico</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        {stats.busiestHours.length === 0 ? (
                            <div className="text-center text-slate-400 font-medium">Nenhum pedido no período.</div>
                        ) : (
                            <div className="space-y-4">
                                {stats.busiestHours.map((slot, i) => {
                                    const maxCount = Math.max(...stats.busiestHours.map(s => s.count));
                                    const percentage = Math.round((slot.count / maxCount) * 100);

                                    return (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-12 text-sm font-bold text-slate-600 text-right shrink-0">
                                                {slot.hour}
                                            </div>
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <div className="w-20 text-xs font-bold text-slate-600 shrink-0">
                                                {slot.count} pedidos
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Items Table/List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Itens Mais Vendidos</h2>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        {stats.topItems.length === 0 ? (
                            <div className="text-center text-slate-400 font-medium p-8">Nenhuma venda no período.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="p-4 pl-6">Produto</th>
                                        <th className="p-4 text-center">Saídas</th>
                                        <th className="p-4 pr-6 text-right">Receita Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {stats.topItems.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-3">
                                                <span className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-sm",
                                                    i === 0 ? "bg-amber-100 text-amber-700" :
                                                    i === 1 ? "bg-slate-200 text-slate-600" :
                                                    i === 2 ? "bg-orange-100 text-orange-700" :
                                                    "bg-slate-100 text-slate-500"
                                                )}>
                                                    {i + 1}
                                                </span>
                                                <span className="truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                            </td>
                                            <td className="p-4 text-center font-black text-slate-600">
                                                {item.quantity}x
                                            </td>
                                            <td className="p-4 pr-6 text-right font-black text-emerald-600">
                                                {formatCurrency(item.revenue)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
