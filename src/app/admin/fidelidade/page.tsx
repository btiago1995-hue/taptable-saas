"use client";

import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Star, Gift, Phone, RotateCcw, Save, Loader2, Search, CheckCircle2, Trophy, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface LoyaltyCustomer {
  id: string;
  phone_number: string;
  name: string;
  stars: number;
  total_redeemed: number;
  updated_at: string;
}

interface LoyaltySettings {
  loyalty_active: boolean;
  loyalty_stars_threshold: number;
  loyalty_reward_description: string;
}

export default function FidelidadePage() {
  const { user } = useAuth();
  const [customers, setCustomers]     = useState<LoyaltyCustomer[]>([]);
  const [settings, setSettings]       = useState<LoyaltySettings>({
    loyalty_active: true,
    loyalty_stars_threshold: 10,
    loyalty_reward_description: "Refeição grátis por conta da casa",
  });
  const [loading, setLoading]         = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [redeemPhone, setRedeemPhone] = useState("");
  const [redeeming, setRedeeming]     = useState(false);
  const [redeemMsg, setRedeemMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [search, setSearch]           = useState("");

  const fetchData = useCallback(async () => {
    if (!user?.restaurantId) return;
    setLoading(true);
    const [{ data: lc }, { data: rest }] = await Promise.all([
      supabase.from("loyalty_customers")
        .select("id, phone_number, name, stars, total_redeemed, updated_at")
        .eq("restaurant_id", user.restaurantId)
        .order("stars", { ascending: false }),
      supabase.from("restaurants")
        .select("loyalty_active, loyalty_stars_threshold, loyalty_reward_description")
        .eq("id", user.restaurantId)
        .single(),
    ]);
    setCustomers(lc || []);
    if (rest) setSettings(rest as LoyaltySettings);
    setLoading(false);
  }, [user?.restaurantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveSettings = async () => {
    if (!user?.restaurantId) return;
    setSavingSettings(true);
    await supabase.from("restaurants").update(settings).eq("id", user.restaurantId);
    setSavingSettings(false);
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.restaurantId || !redeemPhone) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const { data, error } = await supabase.rpc("redeem_loyalty_reward", {
        p_restaurant_id: user.restaurantId,
        p_phone_number: redeemPhone,
      });
      if (error) throw error;
      if (data === -1) {
        setRedeemMsg({ type: "err", text: `Estrelas insuficientes para resgatar (mínimo ${settings.loyalty_stars_threshold})` });
      } else {
        setRedeemMsg({ type: "ok", text: `Prémio resgatado com sucesso! Estrelas deduzidas.` });
        setRedeemPhone("");
        fetchData();
      }
    } catch (err: any) {
      setRedeemMsg({ type: "err", text: err.message || "Erro ao resgatar" });
    } finally {
      setRedeeming(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number.includes(search)
  );

  const stats = {
    total: customers.length,
    eligible: customers.filter(c => c.stars >= settings.loyalty_stars_threshold).length,
    redeemed: customers.reduce((s, c) => s + c.total_redeemed, 0),
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Star className="w-8 h-8 text-amber-500 fill-amber-400" />
          Programa de Fidelidade
        </h1>
        <p className="text-slate-500 font-medium mt-1 ml-11">
          Clientes acumulam estrelas a cada pedido e trocam por prémios
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings + Redeem */}
        <div className="space-y-4">
          {/* Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" /> Configurações
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Programa activo</span>
              <button
                onClick={() => setSettings(s => ({ ...s, loyalty_active: !s.loyalty_active }))}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.loyalty_active ? "bg-amber-400" : "bg-slate-200"
                )}
              >
                <span className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  settings.loyalty_active ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Estrelas para prémio</label>
              <input
                type="number"
                min={1}
                max={100}
                value={settings.loyalty_stars_threshold}
                onChange={e => setSettings(s => ({ ...s, loyalty_stars_threshold: parseInt(e.target.value) || 10 }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Descrição do prémio</label>
              <input
                type="text"
                value={settings.loyalty_reward_description}
                onChange={e => setSettings(s => ({ ...s, loyalty_reward_description: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          </div>

          {/* Redeem */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary-600" /> Resgatar Prémio
            </h3>
            <p className="text-xs text-slate-500">Insere o telefone do cliente para deduzir {settings.loyalty_stars_threshold} estrelas e marcar prémio como resgatado.</p>
            <form onSubmit={handleRedeem} className="space-y-3">
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="Nº telefone do cliente"
                  value={redeemPhone}
                  onChange={e => setRedeemPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              {redeemMsg && (
                <p className={cn("text-xs font-semibold flex items-center gap-1", redeemMsg.type === "ok" ? "text-emerald-600" : "text-red-600")}>
                  {redeemMsg.type === "ok" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                  {redeemMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={redeeming || !redeemPhone}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm"
              >
                {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                Resgatar
              </button>
            </form>
          </div>
        </div>

        {/* Right: Customers table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Membros", value: stats.total,    icon: Users,   color: "text-slate-900" },
              { label: "Elegíveis", value: stats.eligible, icon: Trophy,  color: "text-amber-600" },
              { label: "Resgates", value: stats.redeemed, icon: Gift,    color: "text-primary-600" },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Search + table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome ou telefone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Cliente","Telefone","Estrelas","Resgates","Última actividade"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-bold text-slate-500 uppercase text-xs tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Nenhum membro encontrado.</td></tr>
                  )}
                  {filtered.map(c => (
                    <tr key={c.id} className={cn("hover:bg-slate-50 transition-colors", c.stars >= settings.loyalty_stars_threshold && "bg-amber-50/30")}>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{c.name || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{c.phone_number}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex">
                            {Array.from({ length: Math.min(c.stars, 10) }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            ))}
                            {c.stars > 10 && <span className="text-xs font-bold text-amber-600 ml-1">+{c.stars - 10}</span>}
                          </div>
                          <span className="text-xs font-bold text-slate-700 ml-1">{c.stars}</span>
                          {c.stars >= settings.loyalty_stars_threshold && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1">Elegível</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600 font-bold">{c.total_redeemed}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {new Date(c.updated_at).toLocaleDateString("pt-CV")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
