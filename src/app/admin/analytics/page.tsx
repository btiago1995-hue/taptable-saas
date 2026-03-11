"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { generateMockHistoricalOrders, calculateAnalytics } from "@/lib/mockAnalytics";
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
    Smartphone
} from "lucide-react";

export default function AnalyticsDashboard() {
    const { user } = useAuth();

    // In a real app, this would be fetched from an API based on the selected period
    const [period, setPeriod] = useState<"hoje" | "semana" | "mes">("semana");

    // Use empty data for new SaaS tenants until historical fetching is implemented
    const stats = useMemo(() => {
        return calculateAnalytics([]);
    }, [period]);

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
                                    ? "bg-primary-600 text-white shadow-sm"
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
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Banknote className="w-6 h-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3 mr-1" /> +12%
                        </span>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1">Receita Total</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(stats.totalRevenue)}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {period === 'hoje' ? 'Hoje' : period === 'semana' ? '7 dias' : '30 dias'}
                        </span>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1">Total de Pedidos</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">{stats.totalOrders}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1">Ticket Médio</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">{formatCurrency(stats.averageTicket)}</h3>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                            -2 min
                        </span>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-1">Tempo Médio p/ Servir</p>
                    <h3 className="text-2xl font-extrabold text-slate-900">{stats.averageServiceTimeMinutes} min</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Origins Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                            <Truck className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Origem dos Pedidos</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                                    <Store className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">Salão</div>
                                    <div className="text-xs text-slate-500 font-medium">Consumo no local</div>
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900">
                                {Math.round((stats.ordersByOrigin?.in_store || 0) / stats.totalOrders * 100) || 0}%
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">Delivery</div>
                                    <div className="text-xs text-slate-500 font-medium">Entrega Express</div>
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900">
                                {Math.round((stats.ordersByOrigin?.delivery || 0) / stats.totalOrders * 100) || 0}%
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 leading-tight">Retirada (Pickup)</div>
                                    <div className="text-xs text-slate-500 font-medium">Balcão ou Drive-thru</div>
                                </div>
                            </div>
                            <div className="text-xl font-black text-slate-900">
                                {Math.round((stats.ordersByOrigin?.pickup || 0) / stats.totalOrders * 100) || 0}%
                            </div>
                        </div>
                    </div>
                </div>
                {/* Busiest Hours Chart (Simulated visually) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="bg-primary-100 p-2 rounded-lg text-primary-700">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Horários de Pico</h2>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        <div className="space-y-5">
                            {stats.busiestHours.map((slot, i) => {
                                // Calculate percentage relative to the highest bar
                                const maxCount = Math.max(...stats.busiestHours.map(s => s.count));
                                const percentage = Math.round((slot.count / maxCount) * 100);

                                return (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-16 text-sm font-semibold text-slate-500 text-right">
                                            {slot.hour}
                                        </div>
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="w-20 text-sm font-bold text-slate-900">
                                            {slot.count} pedidos
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Items Table/List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                            <Utensils className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Mais Vendidos</h2>
                    </div>
                    <div className="p-0 flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                    <th className="p-4 pl-6">Item</th>
                                    <th className="p-4 text-center">Qtd</th>
                                    <th className="p-4 pr-6 text-right">Receita</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {stats.topItems.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {i + 1}
                                            </span>
                                            {item.name}
                                        </td>
                                        <td className="p-4 text-center font-semibold text-slate-600">
                                            {item.quantity}
                                        </td>
                                        <td className="p-4 pr-6 text-right font-bold text-emerald-600">
                                            {formatCurrency(item.revenue)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    );
}
