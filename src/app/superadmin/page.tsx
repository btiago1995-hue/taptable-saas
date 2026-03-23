"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Store, AlertTriangle, Loader2, TrendingUp, ShoppingBag,
  Clock, CheckCircle2, XCircle, ChevronRight
} from "lucide-react";

// Preços mensais por plano (CVE)
const PLAN_MRR: Record<string, Record<string, number>> = {
  starter: { monthly: 1490, quarterly: Math.round(3990 / 3), annual: Math.round(14900 / 12) },
  growth:  { monthly: 2990, quarterly: Math.round(7990 / 3), annual: Math.round(29900 / 12) },
  pro:     { monthly: 5990, quarterly: Math.round(15990 / 3), annual: Math.round(59900 / 12) },
  // legado
  essencial: { monthly: 1490, quarterly: Math.round(3990 / 3), annual: Math.round(14900 / 12) },
  elite:     { monthly: 5990, quarterly: Math.round(15990 / 3), annual: Math.round(59900 / 12) },
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "PRO",
  essencial: "Essencial",
  elite: "Elite",
};

interface TenantRestaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription_plan?: string;
  subscription_billing?: string;
  subscription_expires_at?: string;
  total_orders?: number;
  gmv?: number;
  daysUntilExpiry?: number | null; // null = sem expiração definida
}

function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function restaurantMRR(r: TenantRestaurant): number {
  const plan = r.subscription_plan || "starter";
  const billing = r.subscription_billing || "monthly";
  return PLAN_MRR[plan]?.[billing] ?? PLAN_MRR["starter"]["monthly"];
}

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<TenantRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  useEffect(() => { fetchRestaurants(); }, []);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);

      const { data: restData, error: restError } = await supabase
        .from("restaurants")
        .select("id, name, slug, is_active, created_at, subscription_plan, subscription_billing, subscription_expires_at");

      if (restError) throw restError;

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("restaurant_id, total_amount")
        .eq("payment_status", "paid");

      if (orderError) throw orderError;

      const orderStats = (orderData || []).reduce((acc: Record<string, { count: number; gmv: number }>, order: any) => {
        if (!acc[order.restaurant_id]) acc[order.restaurant_id] = { count: 0, gmv: 0 };
        acc[order.restaurant_id].count += 1;
        acc[order.restaurant_id].gmv += Number(order.total_amount) || 0;
        return acc;
      }, {});

      const enriched: TenantRestaurant[] = (restData || []).map((r: any) => ({
        ...r,
        total_orders: orderStats[r.id]?.count || 0,
        gmv: orderStats[r.id]?.gmv || 0,
        daysUntilExpiry: getDaysUntilExpiry(r.subscription_expires_at),
      }));

      enriched.sort((a, b) => (b.gmv || 0) - (a.gmv || 0));
      setRestaurants(enriched);
    } catch (err) {
      console.error("Erro ao carregar tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Métricas ──────────────────────────────────────────────────────────────
  const activeRestaurants  = restaurants.filter(r => r.is_active);
  const inactiveCount      = restaurants.filter(r => !r.is_active).length;
  const totalMRR           = activeRestaurants.reduce((sum, r) => sum + restaurantMRR(r), 0);
  const totalGMV           = restaurants.reduce((sum, r) => sum + (r.gmv || 0), 0);
  const totalOrders        = restaurants.reduce((sum, r) => sum + (r.total_orders || 0), 0);

  // Trials a expirar em ≤ 7 dias (urgente)
  const trialsUrgent = restaurants.filter(
    r => r.is_active && r.daysUntilExpiry !== null && r.daysUntilExpiry! <= 7
  ).sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0));

  // ─── Actions ───────────────────────────────────────────────────────────────
  const toggleAccess = async (id: string, current: boolean) => {
    if (!confirm(`${current ? "Suspender" : "Restaurar"} acesso deste restaurante?`)) return;
    try {
      setIsToggling(id);
      const { error } = await supabase.from("restaurants").update({ is_active: !current }).eq("id", id);
      if (error) throw error;
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r));
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally { setIsToggling(null); }
  };

  const changePlan = async (id: string, plan: string) => {
    try {
      setIsToggling(id);
      const { error } = await supabase.from("restaurants").update({ subscription_plan: plan }).eq("id", id);
      if (error) throw error;
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, subscription_plan: plan } : r));
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally { setIsToggling(null); }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin mb-3 text-slate-400" />
        <p className="text-sm font-medium">A carregar ecossistema Dineo...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* Header */}
      <header className="h-14 border-b border-slate-200 bg-white flex items-center px-8 sticky top-0 z-10">
        <div>
          <h1 className="text-sm font-black tracking-tight text-slate-900">Visão de Águia</h1>
          <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Ecossistema Dineo — {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* ── Métricas ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

            {/* Lojas Ativas */}
            <MetricCard
              label="Lojas Ativas"
              value={`${activeRestaurants.length}`}
              sub={`${inactiveCount} suspensa${inactiveCount !== 1 ? "s" : ""}`}
              icon={<Store className="w-4 h-4" />}
              tone="neutral"
            />

            {/* MRR Real */}
            <MetricCard
              label="MRR"
              value={formatCurrency(totalMRR).replace(",00", "")}
              sub="receita mensal recorrente"
              icon={<TrendingUp className="w-4 h-4" />}
              tone="positive"
            />

            {/* GMV */}
            <MetricCard
              label="GMV Total"
              value={formatCurrency(totalGMV).replace(",00", "")}
              sub="volume de negócio processado"
              icon={<ShoppingBag className="w-4 h-4" />}
              tone="neutral"
            />

            {/* Pedidos */}
            <MetricCard
              label="Pedidos"
              value={totalOrders.toLocaleString("pt-PT")}
              sub="transacções processadas"
              icon={<CheckCircle2 className="w-4 h-4" />}
              tone="neutral"
            />

            {/* Trials Urgentes */}
            <MetricCard
              label="Trials a Expirar"
              value={trialsUrgent.length.toString()}
              sub="nos próximos 7 dias"
              icon={<Clock className="w-4 h-4" />}
              tone={trialsUrgent.length > 0 ? "urgent" : "neutral"}
            />
          </div>

          {/* ── Alerta de Churn ──────────────────────────────────────────── */}
          {trialsUrgent.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-black text-amber-900 uppercase tracking-wider">Atenção — Trials a Expirar Esta Semana</h2>
              </div>
              <div className="divide-y divide-amber-100">
                {trialsUrgent.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-100/50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Plano: {PLAN_LABELS[r.subscription_plan || "starter"] || r.subscription_plan}
                        {" · "}
                        Expira: {new Date(r.subscription_expires_at!).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs font-black px-2.5 py-1 rounded-full border",
                        r.daysUntilExpiry! <= 0
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : r.daysUntilExpiry! <= 2
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      )}>
                        {r.daysUntilExpiry! <= 0 ? "Expirado" : `${r.daysUntilExpiry}d restantes`}
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tabela de Tenants ─────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ecossistema de Lojas</h2>
              <span className="text-xs text-slate-400 font-medium">{restaurants.length} restaurante{restaurants.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Restaurante", "MRR", "Pedidos", "GMV", "Plano", "Subscrição", "Estado", ""].map(h => (
                      <th key={h} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {restaurants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-14 text-center text-slate-400 text-sm font-medium">
                        Nenhum restaurante registado.
                      </td>
                    </tr>
                  ) : restaurants.map((r, idx) => {
                    const isUrgent = r.daysUntilExpiry !== null && r.daysUntilExpiry! <= 7;
                    const isExpired = r.daysUntilExpiry !== null && r.daysUntilExpiry! <= 0;

                    return (
                      <tr key={r.id} className={cn(
                        "hover:bg-slate-50/70 transition-colors",
                        isUrgent && "bg-amber-50/30"
                      )}>
                        {/* Nome */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 && (r.gmv || 0) > 0 && <span className="text-base leading-none">🏆</span>}
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                              <a href={`/p/${r.slug}`} target="_blank" rel="noreferrer"
                                className="text-xs text-slate-400 hover:text-primary-600 font-medium transition-colors">
                                /{r.slug}
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* MRR da loja */}
                        <td className="px-5 py-4 text-sm font-black text-slate-700 whitespace-nowrap">
                          {formatCurrency(restaurantMRR(r)).replace(",00", "")}<span className="text-slate-300 font-medium">/mês</span>
                        </td>

                        {/* Pedidos */}
                        <td className="px-5 py-4 text-sm font-bold text-slate-600 text-center">
                          {(r.total_orders || 0).toLocaleString("pt-PT")}
                        </td>

                        {/* GMV */}
                        <td className="px-5 py-4 text-sm font-black text-slate-900 whitespace-nowrap">
                          {formatCurrency(r.gmv || 0).replace(",00", "")}
                        </td>

                        {/* Plano */}
                        <td className="px-5 py-4">
                          <select
                            disabled={isToggling === r.id}
                            value={r.subscription_plan || "growth"}
                            onChange={e => changePlan(r.id, e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg px-2.5 py-2 outline-none focus:border-slate-400 disabled:opacity-50 w-full"
                          >
                            <option value="starter">Starter — 1.490$</option>
                            <option value="growth">Growth — 2.990$</option>
                            <option value="pro">PRO — 5.990$</option>
                          </select>
                        </td>

                        {/* Subscrição / Trial */}
                        <td className="px-5 py-4">
                          {r.daysUntilExpiry === null ? (
                            <span className="text-xs text-slate-300 font-medium">—</span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> Expirado
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3" /> {r.daysUntilExpiry}d
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-500">
                              {new Date(r.subscription_expires_at!).toLocaleDateString("pt-PT")}
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4">
                          {r.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Suspenso
                            </span>
                          )}
                        </td>

                        {/* Ação */}
                        <td className="px-5 py-4 text-right">
                          <button
                            disabled={isToggling === r.id}
                            onClick={() => toggleAccess(r.id, r.is_active)}
                            className={cn(
                              "text-xs font-bold px-3 py-2 rounded-lg border transition-all disabled:opacity-40 whitespace-nowrap",
                              r.is_active
                                ? "bg-white text-rose-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50"
                                : "bg-slate-900 text-white border-transparent hover:bg-slate-700"
                            )}
                          >
                            {isToggling === r.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : r.is_active ? "Suspender" : "Restaurar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer com MRR total */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">MRR calculado por plano e ciclo de facturação de cada restaurante</p>
              <p className="text-sm font-black text-slate-900">
                Total MRR: {formatCurrency(totalMRR).replace(",00", "")}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Componente MetricCard ──────────────────────────────────────────────────

type Tone = "neutral" | "positive" | "urgent";

const toneStyles: Record<Tone, { card: string; icon: string; value: string }> = {
  neutral:  { card: "bg-white border-slate-200",           icon: "bg-slate-100 text-slate-500",            value: "text-slate-900" },
  positive: { card: "bg-white border-slate-200",           icon: "bg-secondary-100 text-secondary-600",    value: "text-slate-900" },
  urgent:   { card: "bg-amber-50 border-amber-200",        icon: "bg-amber-100 text-amber-700",             value: "text-amber-900" },
};

function MetricCard({ label, value, sub, icon, tone = "neutral" }: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone?: Tone;
}) {
  const s = toneStyles[tone];
  return (
    <div className={cn("border rounded-2xl p-5 flex flex-col gap-3", s.card)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", s.icon)}>
          {icon}
        </div>
      </div>
      <div>
        <p className={cn("text-2xl font-black tracking-tight leading-none", s.value)}>{value}</p>
        <p className="text-[11px] text-slate-400 font-medium mt-1.5 leading-snug">{sub}</p>
      </div>
    </div>
  );
}
