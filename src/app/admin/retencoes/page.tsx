"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePlanGate } from "@/lib/planGate";
import { ShieldAlert, Download, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Retencao {
  id: string;
  tipo: "IRS" | "IRC";
  percentagem: number;
  base_incidencia: number;
  valor_retido: number;
  nif_retido?: string;
  nome_retido?: string;
  document_ref?: string;
  created_at: string;
}

export default function RetencoesPage() {
  const { user } = useAuth();
  const { allowed } = usePlanGate("retencoes");
  const [retencoes, setRetencoes] = useState<Retencao[]>([]);
  const [loading, setLoading] = useState(true);
  const [month] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user?.restaurantId) return;
    fetchRetencoes();
  }, [user?.restaurantId]);

  const fetchRetencoes = async () => {
    setLoading(true);
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
    const { data } = await supabase
      .from("irs_irc_retencoes")
      .select("*")
      .eq("restaurant_id", user!.restaurantId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });
    setRetencoes(data || []);
    setLoading(false);
  };

  const totalIRS = retencoes.filter((r) => r.tipo === "IRS").reduce((s, r) => s + r.valor_retido, 0);
  const totalIRC = retencoes.filter((r) => r.tipo === "IRC").reduce((s, r) => s + r.valor_retido, 0);
  const totalRetido = totalIRS + totalIRC;

  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  if (!allowed) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-primary-600" />
          Retenções na Fonte IRS/IRC
        </h1>
        <p className="text-slate-500 font-medium mt-1 ml-11">
          {MONTHS[month - 1]} {year} — Registo de retenções para declaração fiscal
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Retido</p>
          <p className="text-2xl font-black text-slate-900">{totalRetido.toLocaleString("pt-CV")} CVE</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Retenções IRS</p>
          <p className="text-2xl font-black text-blue-600">{totalIRS.toLocaleString("pt-CV")} CVE</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Retenções IRC</p>
          <p className="text-2xl font-black text-purple-600">{totalIRC.toLocaleString("pt-CV")} CVE</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Data</th>
                <th className="text-left px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Entidade</th>
                <th className="text-right px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Base</th>
                <th className="text-right px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Taxa</th>
                <th className="text-right px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Retido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="text-center py-12 text-slate-400">A carregar...</td></tr>}
              {!loading && retencoes.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  Nenhuma retenção registada este mês. As retenções são criadas automaticamente ao emitir faturas B2B.
                </td></tr>
              )}
              {retencoes.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(r.created_at).toLocaleDateString("pt-CV")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.tipo === "IRS" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">{r.nome_retido || "—"}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.nif_retido || ""}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">{r.base_incidencia.toLocaleString("pt-CV")} CVE</td>
                  <td className="px-6 py-4 text-right text-slate-600">{r.percentagem}%</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{r.valor_retido.toLocaleString("pt-CV")} CVE</td>
                </tr>
              ))}
            </tbody>
            {retencoes.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={5} className="px-6 py-3 font-bold text-slate-700 text-right uppercase text-xs tracking-wider">Total a declarar</td>
                  <td className="px-6 py-3 text-right font-black text-slate-900">{totalRetido.toLocaleString("pt-CV")} CVE</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
