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
import { useOrders } from "@/lib/OrderContext";
import { useAuth } from "@/lib/AuthContext";
import { useMemo } from "react";
import Link from "next/link";

export default function AdminDashboard() {
    const { orders: activeOrders } = useOrders();
    const { user } = useAuth();

    const statsData = useMemo(() => {
        const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const totalTips = activeOrders.reduce((sum, o) => sum + o.tip, 0);
        const tipPercentage = totalRevenue > 0 ? ((totalTips / totalRevenue) * 100).toFixed(1) : "0";

        return {
            revenue: totalRevenue,
            avgTicket: activeOrders.length > 0 ? (totalRevenue / activeOrders.length) : 0,
            tipPercentage: `${tipPercentage}%`
        };
    }, [activeOrders]);

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
        { label: "Faturamento Diário", value: formatCurrency(statsData.revenue), change: "+12.5%", icon: DollarSign },
        { label: "Ticket Médio", value: formatCurrency(statsData.avgTicket), change: "+4.2%", icon: TrendingUp },
        { label: "Tempo Checkout", value: "1.2 min", change: "-15%", icon: Clock },
        { label: "Gorjeta Média", value: statsData.tipPercentage, change: "+2%", icon: Wallet },
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

                {/* Revenue Chart Mock */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        Evolução de Faturamento
                    </h3>
                    <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 flex items-end p-4 gap-2 h-64">
                        {/* Fake bar chart */}
                        {[40, 60, 45, 80, 50, 95, 75].map((height, idx) => (
                            <div key={idx} className="flex-1 bg-primary-100 hover:bg-primary-200 rounded-t-md relative group transition-colors" style={{ height: `${height}%` }}>
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                                    {formatCurrency(height * 1500)}
                                </div>
                            </div>
                        ))}
                    </div>
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

                {/* Employee Ranking Mock */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-3">
                    <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
                        Ranking de Equipe (Baseado em Gorjetas & Avaliações)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { name: "Carlos Silva", rating: "4.9", tips: formatCurrency(32000), rank: 1 },
                            { name: "Ana Maria", rating: "4.8", tips: formatCurrency(28500), rank: 2 },
                            { name: "João Pedro", rating: "4.7", tips: formatCurrency(25000), rank: 3 },
                        ].map((employee) => (
                            <div key={employee.rank} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary-200 transition-colors">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg ${employee.rank === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    #{employee.rank}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">{employee.name}</h4>
                                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                        ⭐ {employee.rating} | Gorjetas: {employee.tips}
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
