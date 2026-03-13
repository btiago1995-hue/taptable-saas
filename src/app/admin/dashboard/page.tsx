"use client";

import {
    TrendingUp,
    DollarSign,
    Clock,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Users,
    Receipt,
    Store,
    ExternalLink,
    MonitorPlay
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useOrders, LiveOrder, OrderItem } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
    const { orders: activeOrders } = useOrders();
    const { user } = useAuth();
    const [allHistoricalOrders, setAllHistoricalOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.restaurantId) return;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Fetch all closed orders with their items to calculate top sellers
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('restaurant_id', user.restaurantId)
                    .order('created_at', { ascending: false })
                    .limit(500); // For MVP, fetching last 500 orders

                if (data && !error) {
                    setAllHistoricalOrders(data);
                }
            } catch (err) {
                console.error("Dashboard DB Error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [user?.restaurantId]);

    const statsData = useMemo(() => {
        // We use allHistoricalOrders to give a real representation of all time or recent history
        const sourceData = allHistoricalOrders.length > 0 ? allHistoricalOrders : activeOrders;
        
        const totalRevenue = sourceData.reduce((sum, o) => sum + (o.total_amount || o.totalAmount || 0), 0);
        const totalTips = sourceData.reduce((sum, o) => sum + (o.tip || 0), 0);
        const tipPercentage = totalRevenue > 0 ? ((totalTips / totalRevenue) * 100).toFixed(1) : "0";

        return {
            revenue: totalRevenue,
            avgTicket: sourceData.length > 0 ? (totalRevenue / sourceData.length) : 0,
            tipPercentage: `${tipPercentage}%`,
            orderCount: sourceData.length
        };
    }, [activeOrders, allHistoricalOrders]);

    const chartData = useMemo(() => {
        if (allHistoricalOrders.length === 0) return [];
        
        // Group revenue by day
        const daysMap: Record<string, number> = {};
        allHistoricalOrders.forEach(o => {
           if(o.status !== "delivered") return; // Optional: Only count completed
           const d = new Date(o.created_at || o.createdAt);
           const dayStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); 
           daysMap[dayStr] = (daysMap[dayStr] || 0) + (o.total_amount || o.totalAmount || 0);
        });

        // Convert to array and reverse to chronological order (since fetch was descending)
        return Object.entries(daysMap).map(([name, Total]) => ({ name, Total })).reverse().slice(-7);
    }, [allHistoricalOrders]);

    const topItems = useMemo(() => {
        const itemCounts: Record<string, {name: string, count: number, revenue: number}> = {};
        allHistoricalOrders.forEach(order => {
             const items = order.order_items || order.items || [];
             items.forEach((item: any) => {
                 if(!itemCounts[item.name]) {
                     itemCounts[item.name] = { name: item.name, count: 0, revenue: 0 };
                 }
                 itemCounts[item.name].count += (item.quantity || 1);
                 itemCounts[item.name].revenue += ((item.quantity || 1) * item.price);
             });
        });

        return Object.values(itemCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5
    }, [allHistoricalOrders]);

    const activeTableSet = useMemo(() => {
        const active = new Set<number>();
        const pending = new Set<number>();
        activeOrders.forEach(o => {
            if (o.status === "new" || o.status === "preparing") active.add(o.tableNumber);
            if (o.status === "ready") pending.add(o.tableNumber);
        });
        return { active, pending };
    }, [activeOrders]);

    const stats = [
        { label: "Faturamento Histórico", value: formatCurrency(statsData.revenue), change: "Total", icon: DollarSign },
        { label: "Ticket Médio", value: formatCurrency(statsData.avgTicket), change: "~", icon: TrendingUp },
        { label: "Total de Pedidos", value: statsData.orderCount.toString(), change: "Recentes", icon: Receipt },
        { label: "Gorjeta Média", value: statsData.tipPercentage, change: "T.M.", icon: Wallet },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-1">Visão Geral, {user?.name?.split(" ")[0] || "Gerente"}!</h1>
                    <p className="text-slate-500">Acompanhe o desempenho do seu restaurante em tempo real.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-transform hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary-50 rounded-lg">
                                <stat.icon className="w-6 h-6 text-primary-600" />
                            </div>
                            <span className="flex items-center text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                {stat.change} <ArrowUpRight className="w-3 h-3 ml-1" />
                            </span>
                        </div>
                        <h3 className="text-slate-500 font-medium text-sm mb-1">{stat.label}</h3>
                        <p className="text-xl font-extrabold text-slate-900 leading-tight truncate">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col min-h-[300px]">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        Faturamento (Últimos Dias)
                    </h3>
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">Analisando dados...</div>
                    ) : chartData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-100">
                            Nenhuma venda registrada ainda.
                        </div>
                    ) : (
                        <div className="flex-1 w-full h-full min-h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                                        dy={10} 
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
                                        formatter={(value: any) => [formatCurrency(Number(value) || 0), "Faturamento"]}
                                        labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Bar dataKey="Total" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Live POS / Table Heatmap Mock */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800">Mesas Ativas</h3>
                        <span className="flex items-center gap-2 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full animate-pulse">
                            <MonitorPlay className="w-3 h-3" /> Ao Vivo
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 flex-1 overflow-y-auto max-h-64 pr-2">
                        {Array.from({ length: 15 }).map((_, idx) => {
                            const tableNum = idx + 1;
                            const isActiveObj = activeTableSet.active.has(tableNum);
                            const isPendingObj = activeTableSet.pending.has(tableNum);

                            let bgColor = "bg-slate-50 border-slate-200 text-slate-400";
                            if (isActiveObj) bgColor = "bg-primary-50 border-primary-200 text-primary-700 font-bold border-2";
                            if (isPendingObj) bgColor = "bg-amber-50 border-amber-200 text-amber-700 font-bold border-2 animate-pulse";

                            return (
                                <div key={idx} className={`rounded-xl border flex flex-col items-center justify-center p-4 text-sm font-medium ${bgColor} cursor-pointer hover:shadow-md transition-shadow`}>
                                    Mesa {tableNum}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Selling Items */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-3">
                    <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
                        Favoritos da Casa (Pratos Mais Vendidos)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isLoading ? (
                            <div className="text-slate-400 px-2 font-medium">Carregando pratos...</div>
                        ) : topItems.length === 0 ? (
                            <div className="text-slate-400 px-2 font-medium">Nenhum pedido finalizado no histórico.</div>
                        ) : topItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary-200 transition-colors">
                                <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-lg ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 
                                    idx === 1 ? 'bg-slate-200 text-slate-600' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-primary-50 text-primary-600'
                                    }`}>
                                    #{idx + 1}
                                </div>
                                <div className="min-w-0 pr-2">
                                    <h4 className="font-bold text-slate-900 truncate">{item.name}</h4>
                                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                        Vendas: {item.count} un. | Gerou: {formatCurrency(item.revenue)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}
