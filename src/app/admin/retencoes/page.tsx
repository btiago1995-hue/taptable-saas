"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePlanGate } from "@/lib/planGate";
import { ShieldAlert, Plus, X, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface Retencao {
  id: string;
  type: "IRS" | "IRC";
  rate: number;
  base_amount: number;
  retained_amount: number;
  entity_nif: string;
  entity_name: string;
  invoice_ref?: string;
  created_at: string;
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function RetencoesPage() {
  const { user } = useAuth();
  const { allowed } = usePlanGate("retencoes");

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [retencoes, setRetencoes] = useState<Retencao[]>([]);
  const [totals, setTotals] = useState({ total: 0, totalIRS: 0, totalIRC: 0 });
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "IRS" as "IRS" | "IRC",
    entityName: "",
    entityNif: "",
    baseAmount: "",
    rate: "20",
    invoiceRef: "",
  });

  const fetchRetencoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/retencoes?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setRetencoes(data.retencoes || []);
        setTotals(data.totals || { total: 0, totalIRS: 0, totalIRC: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    if (user?.restaurantId) fetchRetencoes();
  }, [fetchRetencoes, user?.restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/retencoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName: form.entityName,
          entityNif:  form.entityNif,
          baseAmount: Number(form.baseAmount),
          type:       form.type,
          rate:       Number(form.rate),
          invoiceRef: form.invoiceRef || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ type: "IRS", entityName: "", entityNif: "", baseAmount: "", rate: "20", invoiceRef: "" });
        fetchRetencoes();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowed) return null;

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary-600" />
            Retenções na Fonte IRS/IRC
          </h1>
          <p className="text-slate-500 font-medium mt-1 ml-11">
            Registo de retenções para declaração fiscal — DNRE Cabo Verde
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Registar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Retido",     value: totals.total,    color: "text-slate-900" },
          { label: "Retenções IRS",    value: totals.totalIRS, color: "text-blue-600" },
          { label: "Retenções IRC",    value: totals.totalIRC, color: "text-purple-600" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-2xl font-black ${kpi.color}`}>{formatCurrency(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Data", "Tipo", "Entidade / NIF", "Base", "Taxa", "Retido", "Referência"].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
              )}
              {!loading && retencoes.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                  Nenhuma retenção registada em {MONTHS[month - 1]} {year}.
                </td></tr>
              )}
              {retencoes.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("pt-CV")}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.type === "IRS" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900">{r.entity_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.entity_nif}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{formatCurrency(r.base_amount)}</td>
                  <td className="px-5 py-3.5 text-slate-600">{r.rate}%</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">{formatCurrency(r.retained_amount)}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-slate-400 font-mono">{r.invoice_ref || "—"}</td>
                </tr>
              ))}
            </tbody>
            {retencoes.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={6} className="px-5 py-3 font-bold text-slate-700 text-right uppercase text-xs tracking-wider">Total a declarar</td>
                  <td className="px-5 py-3 text-right font-black text-slate-900">{formatCurrency(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Manual entry modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-bold text-lg text-slate-900">Registar Retenção</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-300">
                    <option value="IRS">IRS — Pessoa Singular</option>
                    <option value="IRC">IRC — Empresa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Taxa %</label>
                  <input required type="number" step="0.01" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nome da Entidade</label>
                <input required type="text" value={form.entityName} onChange={e => setForm(f => ({ ...f, entityName: e.target.value }))}
                  placeholder="Ex: Empresa ABC Lda." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">NIF da Entidade</label>
                <input required type="text" value={form.entityNif} onChange={e => setForm(f => ({ ...f, entityNif: e.target.value }))}
                  placeholder="000000000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Base de Incidência (CVE)</label>
                <input required type="number" step="0.01" value={form.baseAmount} onChange={e => setForm(f => ({ ...f, baseAmount: e.target.value }))}
                  placeholder="0.00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              {form.baseAmount && form.rate && (
                <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 flex justify-between">
                  <span>Valor a reter:</span>
                  <span className="font-black text-slate-900">{formatCurrency(Number(form.baseAmount) * Number(form.rate) / 100)}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Referência Fatura (opcional)</label>
                <input type="text" value={form.invoiceRef} onChange={e => setForm(f => ({ ...f, invoiceRef: e.target.value }))}
                  placeholder="FT 2025/0001" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> A guardar...</> : "Guardar Retenção"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
