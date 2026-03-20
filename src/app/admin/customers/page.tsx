"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Mail, MessageSquare, ArrowUpDown, Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCustomers() {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSegment, setActiveSegment] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchCustomers = async () => {
            if (!user?.restaurantId) return;
            setIsLoading(true);
            try {
                // 1. Fetch Loyalty Customers (the primary CRM database)
                const { data: loyaltyData, error: lError } = await supabase
                    .from('loyalty_customers')
                    .select('*')
                    .eq('restaurant_id', user.restaurantId);

                if (lError) throw lError;

                // 2. Fetch Orders to calculate REAL LTV and Last Visit
                // We fetch only columns needed to save memory
                const { data: ordersData, error: oError } = await supabase
                    .from('orders')
                    .select('customer_phone, total_amount, created_at')
                    .eq('restaurant_id', user.restaurantId)
                    .not('customer_phone', 'is', null);

                if (oError) throw oError;

                // 3. Aggregate Orders by Phone Number
                const customerStats: Record<string, { ltv: number, lastVisit: string, visitCount: number }> = {};
                ordersData?.forEach((order: any) => {
                    const phone = order.customer_phone;
                    if (!customerStats[phone]) {
                        customerStats[phone] = { ltv: 0, lastVisit: order.created_at, visitCount: 0 };
                    }
                    customerStats[phone].ltv += Number(order.total_amount || 0);
                    customerStats[phone].visitCount += 1;
                    if (new Date(order.created_at) > new Date(customerStats[phone].lastVisit)) {
                        customerStats[phone].lastVisit = order.created_at;
                    }
                });

                // 4. Merge Loyalty Data with Order Stats
                const merged = (loyaltyData || []).map(lc => {
                    const stats = customerStats[lc.phone_number] || { ltv: 0, lastVisit: lc.created_at, visitCount: 0 };
                    
                    // Determine status logic
                    let status = "Novo";
                    const lastVisitDate = new Date(stats.lastVisit);
                    const daysSinceLastVisit = (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
                    
                    // Priority: Risk > VIP > Recurrent > New
                    if (daysSinceLastVisit > 45 && stats.visitCount > 0) status = "Em Risco";
                    else if (lc.stars >= 10 || stats.visitCount >= 10) status = "Vip";
                    else if (stats.visitCount >= 3) status = "Recorrente";

                    return {
                        id: lc.id,
                        name: lc.name || "Cliente S/ Nome",
                        phone: lc.phone_number,
                        visits: stats.visitCount || lc.stars || 0, // Fallback to stars for older entries
                        stars: lc.stars,
                        ltv: stats.ltv,
                        lastVisit: lastVisitDate.toLocaleDateString('pt-PT'),
                        lastVisitRaw: stats.lastVisit,
                        status
                    };
                });
                
                setCustomers(merged.sort((a, b) => b.ltv - a.ltv));
            } catch (err) {
                console.error("Error fetching CRM data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCustomers();
    }, [user?.restaurantId]);

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             c.phone.includes(searchQuery);
        
        if (activeSegment === "vip") return matchesSearch && c.status === "Vip";
        if (activeSegment === "risk") return matchesSearch && c.status === "Em Risco";
        return matchesSearch;
    });

    const exportToCSV = () => {
        const headers = ["Nome", "Telemovel", "Visitas", "Estrelas Fidelidade", "Gasto Total (LTV)", "Ultima Visita", "Status"];
        const rows = filteredCustomers.map(c => [
            `"${c.name}"`,
            `"${c.phone}"`,
            c.visits,
            c.stars,
            c.ltv.toFixed(2),
            c.lastVisit,
            c.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `crm_dineo_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const stats = {
        total: customers.length,
        vips: customers.filter(c => c.status === "Vip").length,
        avgLtv: customers.length > 0 ? customers.reduce((acc, c) => acc + c.ltv, 0) / customers.length : 0,
        retention: customers.length > 0 ? (customers.filter(c => c.visits > 1).length / customers.length * 100).toFixed(1) : 0
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Vip": return "bg-purple-100 text-purple-700 font-bold border-purple-200";
            case "Recorrente": return "bg-emerald-100 text-emerald-700 font-medium border-emerald-200";
            case "Novo": return "bg-blue-100 text-blue-700 font-medium border-blue-200";
            case "Em Risco": return "bg-rose-100 text-rose-700 font-bold border-rose-200";
            default: return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    return (
        <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">CRM e Clientes</h1>
                    <p className="text-slate-500">Entenda quem são seus clientes e fidelize os melhores.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={exportToCSV}
                        disabled={isLoading || filteredCustomers.length === 0}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Analytics KPI mini-cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total na Base", value: stats.total },
                    { label: "Clientes VIP (+10 visitas)", value: stats.vips },
                    { label: "Ticket Médio Global", value: formatCurrency(stats.avgLtv) },
                    { label: "Taxa de Retenção", value: `${stats.retention}%` },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 text-sm font-medium mb-1">{kpi.label}</p>
                        <p className="text-xl font-extrabold text-slate-900 truncate">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Table Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[500px] overflow-hidden">

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
                        {[
                            { id: "all", label: "Todos" },
                            { id: "vip", label: "VIPs" },
                            { id: "risk", label: "Em Risco" },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSegment(tab.id)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeSegment === tab.id
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nome ou celular..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-primary-500 transition-colors"
                        />
                    </div>
                </div>

                {/* CRM Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="font-medium">Carregando base de clientes...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase bg-slate-50/50">
                                    <th className="font-semibold px-6 py-4">Cliente</th>
                                    <th className="font-semibold px-6 py-4">Contato</th>
                                    <th className="font-semibold px-6 py-4 text-center">Visitas <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-50" /></th>
                                    <th className="font-semibold px-6 py-4">Status</th>
                                    <th className="font-semibold px-6 py-4 text-right">Ticket Total (LTV) <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-50" /></th>
                                    <th className="font-semibold px-6 py-4 text-right">Última Visita</th>
                                    <th className="font-semibold px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((c) => (
                                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 flex items-center justify-center font-bold flex-shrink-0">
                                                    {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <p className="font-bold text-slate-900">{c.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                            {c.phone}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                                            {c.visits}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${getStatusColor(c.status)}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                                            {formatCurrency(c.ltv)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-slate-500">
                                            {c.lastVisit}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a 
                                                    href={`tel:${c.phone}`}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                </a>
                                                <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {!isLoading && filteredCustomers.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            Nenhum cliente encontrado nesta visão.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
