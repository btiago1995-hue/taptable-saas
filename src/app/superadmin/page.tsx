"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Store, AlertTriangle, Loader2, TrendingUp, ShoppingBag,
  Clock, CheckCircle2, XCircle, ChevronRight, Plus, Search,
  CalendarPlus, CreditCard,
} from "lucide-react";

// ─── Planos ────────────────────────────────────────────────────────────────

const PLAN_MRR: Record<string, Record<string, number>> = {
  starter:  { monthly: 1490, quarterly: Math.round(3990 / 3),  annual: Math.round(14900 / 12) },
  growth:   { monthly: 2990, quarterly: Math.round(7990 / 3),  annual: Math.round(29900 / 12) },
  pro:      { monthly: 5990, quarterly: Math.round(15990 / 3), annual: Math.round(59900 / 12) },
  // legado
  essencial: { monthly: 1490, quarterly: Math.round(3990 / 3),  annual: Math.round(14900 / 12) },
  elite:     { monthly: 5990, quarterly: Math.round(15990 / 3), annual: Math.round(59900 / 12) },
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter", growth: "Growth", pro: "PRO", essencial: "Essencial", elite: "Elite",
};

const BILLING_LABELS: Record<string, string> = {
  monthly: "Mensal", quarterly: "Trimestral", annual: "Anual",
};

// ─── Types ─────────────────────────────────────────────────────────────────

interface TenantRestaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription_plan?: string;
  subscription_billing?: string;
  subscription_expires_at?: string;
  subscription_status?: string;
  total_orders?: number;
  gmv?: number;
  lastOrderAt?: string | null;
  daysUntilExpiry?: number | null;
}

interface PaymentForm {
  restaurantId:   string;
  restaurantName: string;
  amount:         string;
  method:         string;
  reference:      string;
  notes:          string;
}

interface CreateForm {
  managerName: string;
  email: string;
  password: string;
  restaurantName: string;
  plan: string;
  nif: string;
}

const EMPTY_FORM: CreateForm = {
  managerName: "", email: "", password: "", restaurantName: "", plan: "growth", nif: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function restaurantMRR(r: TenantRestaurant): number {
  const plan    = r.subscription_plan || "starter";
  const billing = r.subscription_billing || "monthly";
  return PLAN_MRR[plan]?.[billing] ?? PLAN_MRR["starter"]["monthly"];
}

function normalizePlan(plan?: string): "starter" | "growth" | "pro" {
  if (plan === "growth") return "growth";
  if (plan === "pro" || plan === "elite") return "pro";
  return "starter";
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  trial:     { label: "Trial",     cls: "bg-blue-50 text-blue-700 border-blue-200"     },
  active:    { label: "Ativo",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  past_due:  { label: "Em Atraso", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  suspended: { label: "Suspenso",  cls: "bg-rose-50 text-rose-700 border-rose-200"     },
  cancelled: { label: "Cancelado", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatLastOrder(date?: string | null): string {
  if (!date) return "—";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7)  return `há ${days}d`;
  if (days < 30) return `há ${Math.floor(days / 7)}sem`;
  return new Date(date).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<TenantRestaurant[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [isToggling,  setIsToggling]  = useState<string | null>(null);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [showCreate,  setShowCreate]  = useState(false);
  const [form,        setForm]        = useState<CreateForm>(EMPTY_FORM);
  const [isCreating,  setIsCreating]  = useState(false);
  const [createError, setCreateError] = useState("");
  const [paymentForm, setPaymentForm] = useState<PaymentForm | null>(null);
  const [isPayment,   setIsPayment]   = useState(false);
  const [paymentError,setPaymentError]= useState("");

  useEffect(() => { fetchRestaurants(); }, []);

  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);

      // Usa API route com supabaseAdmin para bypassar RLS e ver todos os tenants
      const res = await fetch("/api/superadmin/restaurants");
      if (!res.ok) throw new Error("Erro ao carregar dados da plataforma");
      const { restaurants: restData, orders: orderData } = await res.json();

      const orderStats = (orderData || []).reduce(
        (acc: Record<string, { count: number; gmv: number; lastOrderAt: string | null }>, order: any) => {
          if (!acc[order.restaurant_id]) acc[order.restaurant_id] = { count: 0, gmv: 0, lastOrderAt: null };
          acc[order.restaurant_id].count += 1;
          acc[order.restaurant_id].gmv   += Number(order.total_amount) || 0;
          if (!acc[order.restaurant_id].lastOrderAt || order.created_at > acc[order.restaurant_id].lastOrderAt!) {
            acc[order.restaurant_id].lastOrderAt = order.created_at;
          }
          return acc;
        }, {}
      );

      const enriched: TenantRestaurant[] = (restData || []).map((r: any) => ({
        ...r,
        total_orders:      orderStats[r.id]?.count       || 0,
        gmv:               orderStats[r.id]?.gmv         || 0,
        lastOrderAt:       orderStats[r.id]?.lastOrderAt || null,
        daysUntilExpiry:   getDaysUntilExpiry(r.subscription_expires_at),
        subscription_status: r.subscription_status || "trial",
      }));

      enriched.sort((a, b) => (b.gmv || 0) - (a.gmv || 0));
      setRestaurants(enriched);
    } catch (err) {
      console.error("Erro ao carregar tenants:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Métricas ─────────────────────────────────────────────────────────────
  const activeRestaurants = restaurants.filter(r => r.is_active);
  const inactiveCount     = restaurants.filter(r => !r.is_active).length;
  const totalMRR          = activeRestaurants.reduce((sum, r) => sum + restaurantMRR(r), 0);
  const totalGMV          = restaurants.reduce((sum, r) => sum + (r.gmv || 0), 0);
  const totalOrders       = restaurants.reduce((sum, r) => sum + (r.total_orders || 0), 0);

  const trialsUrgent = restaurants
    .filter(r => r.is_active && r.daysUntilExpiry !== null && r.daysUntilExpiry! <= 7)
    .sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0));

  const planDist = {
    starter: activeRestaurants.filter(r => normalizePlan(r.subscription_plan) === "starter").length,
    growth:  activeRestaurants.filter(r => normalizePlan(r.subscription_plan) === "growth").length,
    pro:     activeRestaurants.filter(r => normalizePlan(r.subscription_plan) === "pro").length,
  };

  const filteredRestaurants = searchTerm
    ? restaurants.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.slug || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : restaurants;

  // ─── Actions ──────────────────────────────────────────────────────────────
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

  const extendTrial = async (id: string, days: number) => {
    try {
      setIsToggling(id);
      const r    = restaurants.find(r => r.id === id);
      const base = r?.subscription_expires_at && new Date(r.subscription_expires_at) > new Date()
        ? new Date(r.subscription_expires_at)
        : new Date();
      base.setDate(base.getDate() + days);
      const newExpiry = base.toISOString();
      const { error } = await supabase
        .from("restaurants")
        .update({ subscription_expires_at: newExpiry })
        .eq("id", id);
      if (error) throw error;
      setRestaurants(prev => prev.map(r =>
        r.id === id
          ? { ...r, subscription_expires_at: newExpiry, daysUntilExpiry: getDaysUntilExpiry(newExpiry) }
          : r
      ));
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally { setIsToggling(null); }
  };

  const openPaymentModal = (r: TenantRestaurant) => {
    const plan    = r.subscription_plan || "starter";
    const billing = r.subscription_billing || "monthly";
    const amounts: Record<string, Record<string, number>> = {
      starter: { monthly: 1490, quarterly: 3990,  annual: 14900 },
      growth:  { monthly: 2990, quarterly: 7990,  annual: 29900 },
      pro:     { monthly: 5990, quarterly: 15990, annual: 59900 },
    };
    setPaymentForm({
      restaurantId:   r.id,
      restaurantName: r.name,
      amount:         String(amounts[plan]?.[billing] ?? 1490),
      method:         "manual",
      reference:      "",
      notes:          "",
    });
    setPaymentError("");
  };

  const submitPayment = async () => {
    if (!paymentForm) return;
    try {
      setIsPayment(true);
      setPaymentError("");
      const res = await fetch("/api/billing/record-payment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          restaurantId: paymentForm.restaurantId,
          amount:       Number(paymentForm.amount),
          method:       paymentForm.method,
          reference:    paymentForm.reference || undefined,
          notes:        paymentForm.notes     || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPaymentError(data.error || "Erro desconhecido."); return; }
      setPaymentForm(null);
      await fetchRestaurants();
    } catch (err: any) {
      setPaymentError(err.message);
    } finally { setIsPayment(false); }
  };

  const createRestaurant = async () => {
    if (!form.managerName || !form.email || !form.password || !form.restaurantName) {
      setCreateError("Preenche todos os campos obrigatórios.");
      return;
    }
    try {
      setIsCreating(true);
      setCreateError("");
      const res = await fetch("/api/onboarding/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           form.managerName,
          email:          form.email,
          password:       form.password,
          restaurantName: form.restaurantName,
          plan:           form.plan,
          ...(form.nif ? { nif: form.nif } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || "Erro desconhecido."); return; }
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await fetchRestaurants();
    } catch (err: any) {
      setCreateError(err.message);
    } finally { setIsCreating(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-500">
        <Loader2 className="w-7 h-7 animate-spin mb-3 text-slate-400" />
        <p className="text-sm font-medium">A carregar ecossistema Dineo...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900">Visão de Águia</h1>
            <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
              Ecossistema Dineo — {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreateError(""); setForm(EMPTY_FORM); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Restaurante
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Métricas ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                label="Lojas Ativas"
                value={`${activeRestaurants.length}`}
                sub={`${inactiveCount} suspensa${inactiveCount !== 1 ? "s" : ""}`}
                icon={<Store className="w-4 h-4" />}
                tone="neutral"
              />
              <MetricCard
                label="MRR"
                value={formatCurrency(totalMRR).replace(",00", "")}
                sub="receita mensal recorrente"
                icon={<TrendingUp className="w-4 h-4" />}
                tone="positive"
              />
              <MetricCard
                label="GMV Total"
                value={formatCurrency(totalGMV).replace(",00", "")}
                sub="volume de negócio processado"
                icon={<ShoppingBag className="w-4 h-4" />}
                tone="neutral"
              />
              <MetricCard
                label="Pedidos"
                value={totalOrders.toLocaleString("pt-PT")}
                sub="transacções processadas"
                icon={<CheckCircle2 className="w-4 h-4" />}
                tone="neutral"
              />
              <MetricCard
                label="Trials a Expirar"
                value={trialsUrgent.length.toString()}
                sub="nos próximos 7 dias"
                icon={<Clock className="w-4 h-4" />}
                tone={trialsUrgent.length > 0 ? "urgent" : "neutral"}
              />
            </div>

            {/* ── Distribuição por Plano ────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 flex items-center gap-6 flex-wrap">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                Distribuição de Planos
              </p>
              <div className="flex items-center gap-3 flex-wrap flex-1">
                {[
                  { key: "starter", label: "Starter", count: planDist.starter, mrr: PLAN_MRR.starter.monthly, color: "bg-slate-100 text-slate-700 border-slate-200" },
                  { key: "growth",  label: "Growth",  count: planDist.growth,  mrr: PLAN_MRR.growth.monthly,  color: "bg-blue-50 text-blue-700 border-blue-200"   },
                  { key: "pro",     label: "PRO",      count: planDist.pro,     mrr: PLAN_MRR.pro.monthly,     color: "bg-violet-50 text-violet-700 border-violet-200" },
                ].map(p => (
                  <div key={p.key} className={cn("flex items-center gap-2 border rounded-xl px-3.5 py-2", p.color)}>
                    <span className="text-sm font-black">{p.count}</span>
                    <span className="text-xs font-semibold">{p.label}</span>
                    {p.count > 0 && (
                      <span className="text-[10px] font-medium opacity-60">
                        · {formatCurrency(p.count * p.mrr).replace(",00", "")}/mês
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Alerta de Churn ───────────────────────────────────────── */}
            {trialsUrgent.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-black text-amber-900 uppercase tracking-wider">
                    Atenção — Trials a Expirar Esta Semana
                  </h2>
                </div>
                <div className="divide-y divide-amber-100">
                  {trialsUrgent.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-100/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {PLAN_LABELS[r.subscription_plan || "starter"] || r.subscription_plan}
                          {" · "}
                          Expira: {new Date(r.subscription_expires_at!).toLocaleDateString("pt-PT")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                        {/* Extensão de trial */}
                        <button
                          disabled={isToggling === r.id}
                          onClick={() => extendTrial(r.id, 14)}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors disabled:opacity-40"
                        >
                          {isToggling === r.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <><CalendarPlus className="w-3 h-3" /> +14 dias</>
                          }
                        </button>
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tabela de Tenants ─────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider shrink-0">
                  Ecossistema de Lojas
                </h2>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Pesquisar restaurante..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white placeholder-slate-400"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-medium shrink-0">
                    {filteredRestaurants.length} de {restaurants.length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Restaurante", "MRR", "Pedidos", "GMV", "Plano", "Faturação", "Subscrição", "Últ. Pedido", "Billing", "Estado", ""].map(h => (
                        <th key={h} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredRestaurants.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-14 text-center text-slate-400 text-sm font-medium">
                          {searchTerm ? "Nenhum resultado para a pesquisa." : "Nenhum restaurante registado."}
                        </td>
                      </tr>
                    ) : filteredRestaurants.map((r, idx) => {
                      const isUrgent      = r.daysUntilExpiry !== null && r.daysUntilExpiry! <= 7;
                      const isExpired     = r.daysUntilExpiry !== null && r.daysUntilExpiry! <= 0;
                      const daysSinceOrder = r.lastOrderAt
                        ? Math.floor((Date.now() - new Date(r.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const orderSilent   = daysSinceOrder !== null && daysSinceOrder >= 7;

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

                          {/* MRR */}
                          <td className="px-5 py-4 text-sm font-black text-slate-700 whitespace-nowrap">
                            {formatCurrency(restaurantMRR(r)).replace(",00", "")}
                            <span className="text-slate-300 font-medium">/mês</span>
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

                          {/* Faturação */}
                          <td className="px-5 py-4">
                            <span className="text-xs font-medium text-slate-500">
                              {BILLING_LABELS[r.subscription_billing || "monthly"] || r.subscription_billing || "—"}
                            </span>
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

                          {/* Último Pedido */}
                          <td className="px-5 py-4">
                            <span className={cn(
                              "text-xs font-medium",
                              orderSilent ? "text-rose-500" : "text-slate-500"
                            )}>
                              {formatLastOrder(r.lastOrderAt)}
                            </span>
                          </td>

                          {/* Billing Status */}
                          <td className="px-5 py-4">
                            {(() => {
                              const s = r.subscription_status || "trial";
                              const b = STATUS_BADGE[s] ?? STATUS_BADGE["trial"];
                              return (
                                <span className={cn(
                                  "inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border",
                                  b.cls
                                )}>
                                  {b.label}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Estado (acesso) */}
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

                          {/* Ações */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openPaymentModal(r)}
                                className="flex items-center gap-1 text-xs font-bold px-2.5 py-2 rounded-lg border border-slate-200 text-slate-600 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all whitespace-nowrap"
                                title="Registar pagamento"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Pagar
                              </button>
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
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">
                  MRR calculado por plano e ciclo de facturação de cada restaurante
                </p>
                <p className="text-sm font-black text-slate-900">
                  Total MRR: {formatCurrency(totalMRR).replace(",00", "")}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Modal Registar Pagamento ──────────────────────────────────────── */}
      {paymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPaymentForm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">Registar Pagamento</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{paymentForm.restaurantName}</p>
              </div>
              <button onClick={() => setPaymentForm(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormField
                label="Valor (CVE) *"
                value={paymentForm.amount}
                onChange={v => setPaymentForm(f => f ? { ...f, amount: v } : f)}
                placeholder="2990"
              />
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Método *</label>
                <select
                  value={paymentForm.method}
                  onChange={e => setPaymentForm(f => f ? { ...f, method: e.target.value } : f)}
                  className="w-full border border-slate-200 text-slate-700 font-semibold text-sm rounded-lg px-3 py-2.5 outline-none focus:border-slate-400"
                >
                  <option value="manual">Manual (transferência / dinheiro)</option>
                  <option value="vinti4">Vinti4Net</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              <FormField
                label="Referência"
                value={paymentForm.reference}
                onChange={v => setPaymentForm(f => f ? { ...f, reference: v } : f)}
                placeholder="Ref. transferência ou nota"
              />
              <FormField
                label="Notas"
                value={paymentForm.notes}
                onChange={v => setPaymentForm(f => f ? { ...f, notes: v } : f)}
                placeholder="Informação adicional (opcional)"
              />
              {paymentError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700 font-medium">
                  {paymentError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setPaymentForm(null)}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitPayment}
                disabled={isPayment}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {isPayment
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CreditCard className="w-4 h-4" />}
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Novo Restaurante ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">Novo Restaurante</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <FormField
                label="Nome do Gestor *"
                value={form.managerName}
                onChange={v => setForm(f => ({ ...f, managerName: v }))}
                placeholder="João Silva"
              />
              <FormField
                label="Email *"
                type="email"
                value={form.email}
                onChange={v => setForm(f => ({ ...f, email: v }))}
                placeholder="joao@restaurante.com"
              />
              <FormField
                label="Password *"
                type="password"
                value={form.password}
                onChange={v => setForm(f => ({ ...f, password: v }))}
                placeholder="Mínimo 6 caracteres"
              />
              <FormField
                label="Nome do Restaurante *"
                value={form.restaurantName}
                onChange={v => setForm(f => ({ ...f, restaurantName: v }))}
                placeholder="Restaurante Central"
              />
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  Plano *
                </label>
                <select
                  value={form.plan}
                  onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full border border-slate-200 text-slate-700 font-semibold text-sm rounded-lg px-3 py-2.5 outline-none focus:border-slate-400"
                >
                  <option value="starter">Starter — 1.490$/mês</option>
                  <option value="growth">Growth — 2.990$/mês</option>
                  <option value="pro">PRO — 5.990$/mês</option>
                </select>
              </div>
              <FormField
                label="NIF (opcional)"
                value={form.nif}
                onChange={v => setForm(f => ({ ...f, nif: v }))}
                placeholder="9 dígitos"
              />

              {createError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-xs text-rose-700 font-medium">
                  {createError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createRestaurant}
                disabled={isCreating}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {isCreating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Plus className="w-4 h-4" />}
                Criar Restaurante
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Componentes auxiliares ────────────────────────────────────────────────

function FormField({ label, value, onChange, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 text-slate-900 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-slate-400 placeholder-slate-300"
      />
    </div>
  );
}

type Tone = "neutral" | "positive" | "urgent";

const toneStyles: Record<Tone, { card: string; icon: string; value: string }> = {
  neutral:  { card: "bg-white border-slate-200",      icon: "bg-slate-100 text-slate-500",         value: "text-slate-900" },
  positive: { card: "bg-white border-slate-200",      icon: "bg-secondary-100 text-secondary-600", value: "text-slate-900" },
  urgent:   { card: "bg-amber-50 border-amber-200",   icon: "bg-amber-100 text-amber-700",          value: "text-amber-900" },
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
