"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { formatCurrency, cn } from "@/lib/utils";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle,
  FileText, Loader2, CreditCard, RefreshCw,
} from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter", growth: "Growth", pro: "PRO",
};

const BILLING_LABELS: Record<string, string> = {
  monthly: "Mensal", quarterly: "Trimestral", annual: "Anual",
};

const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  starter: { monthly: 1490, quarterly: 3990,  annual: 14900 },
  growth:  { monthly: 2990, quarterly: 7990,  annual: 29900 },
  pro:     { monthly: 5990, quarterly: 15990, annual: 59900 },
};

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  textCls: string;
  bg: string;
  description: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  trial: {
    label: "Período de Trial",
    icon: Clock,
    textCls: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    description: "Está a experimentar o Dineo gratuitamente.",
  },
  active: {
    label: "Activa",
    icon: CheckCircle2,
    textCls: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    description: "A sua subscrição está em dia.",
  },
  past_due: {
    label: "Pagamento em Atraso",
    icon: AlertTriangle,
    textCls: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    description: "O pagamento está em atraso. Regularize para evitar suspensão.",
  },
  suspended: {
    label: "Suspensa",
    icon: XCircle,
    textCls: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    description: "O acesso foi suspenso. Contacte o suporte para reactivar.",
  },
  cancelled: {
    label: "Cancelada",
    icon: XCircle,
    textCls: "text-slate-500",
    bg: "bg-slate-100 border-slate-200",
    description: "Subscrição cancelada.",
  },
};

interface Invoice {
  id: string;
  amount: number;
  plan: string;
  billing_cycle: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const status   = user?.subscriptionStatus || "trial";
  const plan     = user?.restaurantData?.subscriptionPlan    || "starter";
  const billing  = user?.restaurantData?.subscriptionBilling || "monthly";
  const expiresAt = user?.subscriptionExpiresAt;
  const amount   = PLAN_AMOUNTS[plan]?.[billing] ?? 1490;

  const daysLeft = expiresAt
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.trial;
  const StatusIcon = cfg.icon;

  useEffect(() => {
    if (!user?.restaurantId) return;
    setIsLoading(true);
    fetch(`/api/billing/invoices?restaurantId=${user.restaurantId}`)
      .then(r => r.json())
      .then(d => setInvoices(d.invoices || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user?.restaurantId]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscrição & Faturação</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Estado da conta e histórico de pagamentos.</p>
      </div>

      {/* Estado actual */}
      <div className={cn("border rounded-2xl p-6 space-y-4", cfg.bg)}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <StatusIcon className={cn("w-5 h-5", cfg.textCls)} />
          </div>
          <div className="flex-1">
            <p className={cn("text-xs font-black uppercase tracking-widest", cfg.textCls)}>
              {cfg.label}
            </p>
            <p className="font-bold text-slate-900 text-xl mt-1 tracking-tight">
              {PLAN_LABELS[plan] || plan} · {BILLING_LABELS[billing] || billing}
            </p>
            <p className="text-sm text-slate-500 font-medium mt-1">{cfg.description}</p>

            {expiresAt && (
              <p className={cn(
                "text-sm font-semibold mt-2",
                daysLeft !== null && daysLeft <= 3 ? "text-rose-600" : "text-slate-600"
              )}>
                {daysLeft !== null && daysLeft > 0
                  ? `Válido até ${new Date(expiresAt).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })} · ${daysLeft} dias restantes`
                  : `Expirou em ${new Date(expiresAt).toLocaleDateString("pt-PT")}`
                }
              </p>
            )}
          </div>

          {/* Preço do plano */}
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(amount).replace(",00", "")}
            </p>
            <p className="text-xs text-slate-400 font-medium">por mês</p>
          </div>
        </div>

        {/* CTA para past_due ou suspended */}
        {(status === "past_due" || status === "suspended") && (
          <div className="pt-4 border-t border-current/10 flex items-center gap-3 flex-wrap">
            <p className="text-sm text-slate-700 font-medium flex-1">
              Para regularizar a sua conta, contacte a nossa equipa de suporte.
            </p>
            <a
              href="mailto:suporte@dineo.cv"
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Contactar Suporte
            </a>
          </div>
        )}
      </div>

      {/* Histórico de Faturas */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Histórico de Faturas
            </h2>
          </div>
          <button
            onClick={() => {
              if (!user?.restaurantId) return;
              setIsLoading(true);
              fetch(`/api/billing/invoices?restaurantId=${user.restaurantId}`)
                .then(r => r.json())
                .then(d => setInvoices(d.invoices || []))
                .catch(console.error)
                .finally(() => setIsLoading(false));
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-14 text-center">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Nenhuma fatura registada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Data", "Plano", "Valor", "Método", "Referência", "Estado"].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                      {PLAN_LABELS[inv.plan] || inv.plan}
                      <span className="text-slate-400 font-medium"> · {BILLING_LABELS[inv.billing_cycle] || inv.billing_cycle}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.amount).replace(",00", "")}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500 capitalize whitespace-nowrap">
                      {inv.payment_method === "manual" ? "Manual"
                        : inv.payment_method === "vinti4" ? "Vinti4Net"
                        : inv.payment_method === "stripe" ? "Stripe"
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400 font-medium">
                      {inv.payment_reference || inv.notes || "—"}
                    </td>
                    <td className="px-5 py-4">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Pago
                        </span>
                      ) : inv.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pendente
                        </span>
                      ) : (
                        <span className="inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          {inv.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
