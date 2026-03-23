"use client";

import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { BarChart3, Download, Loader2, FileSpreadsheet, ShoppingBag, CreditCard } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type ReportType = "sales" | "items" | "payments";

const REPORT_TYPES: { type: ReportType; label: string; desc: string; icon: any }[] = [
  { type: "sales",    label: "Vendas",       desc: "Um registo por pedido — data, valor, cliente, método de pagamento", icon: ShoppingBag },
  { type: "items",    label: "Produtos",     desc: "Top produtos vendidos com quantidade e receita total", icon: FileSpreadsheet },
  { type: "payments", label: "Pagamentos",   desc: "Resumo por método de pagamento com totais pagos e pendentes", icon: CreditCard },
];

export default function RelatoriosPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [downloading, setDownloading] = useState<ReportType | null>(null);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  const handleDownload = async (type: ReportType) => {
    setDownloading(type);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/reports/export?year=${year}&month=${month}&type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) { alert("Erro ao gerar relatório"); return; }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+?)"/);
      const filename = match ? match[1] : `relatorio_${type}_${year}_${month}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary-600" />
            Relatórios
          </h1>
          <p className="text-slate-500 font-medium mt-1 ml-11">
            Exporta dados de vendas em CSV para Excel ou Google Sheets
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid gap-4">
        {REPORT_TYPES.map(({ type, label, desc, icon: Icon }) => (
          <div key={type} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{label}</p>
                <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {MONTHS[month - 1]} {year} · CSV
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(type)}
              disabled={!!downloading}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm shrink-0"
            >
              {downloading === type
                ? <><Loader2 className="w-4 h-4 animate-spin" /> A gerar...</>
                : <><Download className="w-4 h-4" /> Exportar</>
              }
            </button>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-600">
        <p className="font-bold text-slate-700 mb-1">Como usar</p>
        <p>Abre o ficheiro CSV no <span className="font-semibold">Excel</span>, <span className="font-semibold">Google Sheets</span> ou qualquer software de contabilidade. Os valores monetários estão em CVE.</p>
      </div>
    </div>
  );
}
