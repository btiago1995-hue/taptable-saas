"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePlanGate } from "@/lib/planGate";
import { Users, Plus, ArrowRight, TrendingDown, FileText, CreditCard, CheckCircle2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ClientAccount {
  id: string;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  current_balance: number;
  credit_limit: number;
  created_at: string;
}

export default function ContaCorrentePage() {
  const { user } = useAuth();
  const { allowed } = usePlanGate("conta_corrente");
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", nif: "", email: "", phone: "", credit_limit: "0" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.restaurantId) return;
    fetchAccounts();
  }, [user?.restaurantId]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_accounts")
      .select("*")
      .eq("restaurant_id", user!.restaurantId)
      .order("current_balance", { ascending: false });
    setAccounts(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("client_accounts").insert({
      restaurant_id: user!.restaurantId,
      name: form.name,
      nif: form.nif || null,
      email: form.email || null,
      phone: form.phone || null,
      credit_limit: parseFloat(form.credit_limit) || 0,
    });
    setShowForm(false);
    setForm({ name: "", nif: "", email: "", phone: "", credit_limit: "0" });
    setSaving(false);
    fetchAccounts();
  };

  const totalDevedor = accounts.reduce((s, a) => s + (a.current_balance > 0 ? a.current_balance : 0), 0);
  const totalClientes = accounts.length;
  const emRisco = accounts.filter((a) => a.current_balance > a.credit_limit).length;

  if (!allowed) return null; // Handled by route protection in layout

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary-600" />
            Conta Corrente
          </h1>
          <p className="text-slate-500 font-medium mt-1 ml-11">Gestão de crédito e faturação a clientes B2B</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total em Dívida</p>
          <p className="text-2xl font-black text-red-600">{totalDevedor.toLocaleString("pt-CV")} CVE</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clientes B2B</p>
          <p className="text-2xl font-black text-slate-900">{totalClientes}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Limite Excedido</p>
          <p className="text-2xl font-black text-amber-600">{emRisco}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">NIF</th>
                <th className="text-right px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Saldo Devedor</th>
                <th className="text-right px-6 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">Limite</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">A carregar...</td></tr>
              )}
              {!loading && accounts.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                  Nenhum cliente em conta corrente. Adicione o primeiro clicando em "Novo Cliente".
                </td></tr>
              )}
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{acc.name}</p>
                    <p className="text-xs text-slate-400">{acc.email || acc.phone || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{acc.nif || "—"}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${acc.current_balance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {acc.current_balance.toLocaleString("pt-CV")} CVE
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {acc.credit_limit.toLocaleString("pt-CV")} CVE
                    {acc.current_balance > acc.credit_limit && (
                      <span className="ml-2 text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">EXCEDIDO</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary-600 hover:text-primary-800 font-bold text-xs flex items-center gap-1 ml-auto">
                      Ver <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Account Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Novo Cliente B2B</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {[
              { label: "Nome / Empresa *", key: "name", placeholder: "Ex: Empresa ABC, Lda" },
              { label: "NIF", key: "nif", placeholder: "000000000" },
              { label: "Email", key: "email", placeholder: "empresa@exemplo.cv" },
              { label: "Telefone", key: "phone", placeholder: "+238 9XX XXXX" },
              { label: "Limite de Crédito (CVE)", key: "credit_limit", placeholder: "50000" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
                <input
                  type={key === "credit_limit" ? "number" : "text"}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim()}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "A guardar..." : "Criar Cliente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
