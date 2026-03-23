/**
 * billing.ts — Engine Central de Billing
 *
 * Usado exclusivamente em API routes (server-side).
 * Nunca importar em componentes de cliente.
 */

import { supabaseAdmin } from "@/lib/supabase";

// ─── Preços por plano e ciclo (CVE) ────────────────────────────────────────

export const BILLING_AMOUNTS: Record<string, Record<string, number>> = {
  starter: { monthly: 1490, quarterly: 3990,  annual: 14900 },
  growth:  { monthly: 2990, quarterly: 7990,  annual: 29900 },
  pro:     { monthly: 5990, quarterly: 15990, annual: 59900 },
};

export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";
export type PaymentMethod       = "manual" | "vinti4" | "stripe";
export type BillingCycle        = "monthly" | "quarterly" | "annual";

// Dias de grace period antes de suspender
const GRACE_PERIOD_DAYS = 5;

// ─── Helpers de data ────────────────────────────────────────────────────────

export function getNextExpiry(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  if (cycle === "monthly")   d.setMonth(d.getMonth() + 1);
  if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  if (cycle === "annual")    d.setFullYear(d.getFullYear() + 1);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Criar e registar pagamento num único passo ────────────────────────────
//
// Usado pelo superadmin para pagamentos manuais (transferência bancária, etc.)
// Quando o Vinti4 for aprovado, o webhook chamará esta função.

export async function createAndPayInvoice(params: {
  restaurantId:  string;
  amount?:       number;    // override ao preço do plano (opcional)
  method:        PaymentMethod;
  reference?:    string;
  notes?:        string;
  createdBy?:    string;    // uid do superadmin
}): Promise<{ invoiceId: string; newExpiresAt: string }> {
  const { restaurantId, method, reference, notes, createdBy } = params;

  // 1. Buscar dados actuais do restaurante
  const { data: rest, error: restErr } = await supabaseAdmin
    .from("restaurants")
    .select("subscription_plan, subscription_billing, subscription_expires_at, subscription_status")
    .eq("id", restaurantId)
    .single();

  if (restErr || !rest) throw new Error("Restaurante não encontrado: " + restErr?.message);

  const plan    = rest.subscription_plan  || "starter";
  const cycle   = (rest.subscription_billing || "monthly") as BillingCycle;
  const amount  = params.amount ?? BILLING_AMOUNTS[plan]?.[cycle] ?? BILLING_AMOUNTS.starter.monthly;

  // 2. Calcular nova data de expiração
  //    Se já expirou, conta a partir de hoje; senão estende a partir da data actual
  const baseDate = rest.subscription_expires_at && new Date(rest.subscription_expires_at) > new Date()
    ? new Date(rest.subscription_expires_at)
    : new Date();
  const newExpiresAt = getNextExpiry(baseDate, cycle);

  // 3. Criar a fatura já marcada como paga
  const { data: invoice, error: invErr } = await supabaseAdmin
    .from("subscription_invoices")
    .insert([{
      restaurant_id:     restaurantId,
      amount,
      plan,
      billing_cycle:     cycle,
      status:            "paid",
      due_date:          new Date().toISOString(),
      paid_at:           new Date().toISOString(),
      payment_method:    method,
      payment_reference: reference || null,
      notes:             notes || null,
      created_by:        createdBy || null,
    }])
    .select("id")
    .single();

  if (invErr || !invoice) throw new Error("Erro ao criar fatura: " + invErr?.message);

  // 4. Actualizar o restaurante
  const { error: updateErr } = await supabaseAdmin
    .from("restaurants")
    .update({
      subscription_status:   "active",
      subscription_expires_at: newExpiresAt.toISOString(),
      grace_period_ends_at:  null,
      is_active:             true,
    })
    .eq("id", restaurantId);

  if (updateErr) throw new Error("Erro ao renovar subscrição: " + updateErr.message);

  return { invoiceId: invoice.id, newExpiresAt: newExpiresAt.toISOString() };
}

// ─── Registar pagamento numa fatura já existente ───────────────────────────
//
// Usado pelo webhook do Vinti4: a fatura é criada no checkout,
// e marcada como paga quando o webhook confirma.

export async function recordPaymentOnInvoice(params: {
  invoiceId:  string;
  method:     PaymentMethod;
  reference?: string;
}): Promise<{ restaurantId: string; newExpiresAt: string }> {
  const { invoiceId, method, reference } = params;

  // 1. Buscar a fatura
  const { data: inv, error: invErr } = await supabaseAdmin
    .from("subscription_invoices")
    .select("id, restaurant_id, billing_cycle, status")
    .eq("id", invoiceId)
    .single();

  if (invErr || !inv) throw new Error("Fatura não encontrada");
  if (inv.status === "paid") throw new Error("Fatura já paga");

  // 2. Marcar fatura como paga
  await supabaseAdmin
    .from("subscription_invoices")
    .update({ status: "paid", paid_at: new Date().toISOString(), payment_method: method, payment_reference: reference || null })
    .eq("id", invoiceId);

  // 3. Renovar subscrição
  const { data: rest } = await supabaseAdmin
    .from("restaurants")
    .select("subscription_expires_at")
    .eq("id", inv.restaurant_id)
    .single();

  const baseDate = rest?.subscription_expires_at && new Date(rest.subscription_expires_at) > new Date()
    ? new Date(rest.subscription_expires_at)
    : new Date();
  const newExpiresAt = getNextExpiry(baseDate, inv.billing_cycle as BillingCycle);

  await supabaseAdmin
    .from("restaurants")
    .update({
      subscription_status:    "active",
      subscription_expires_at: newExpiresAt.toISOString(),
      grace_period_ends_at:   null,
      is_active:              true,
    })
    .eq("id", inv.restaurant_id);

  return { restaurantId: inv.restaurant_id, newExpiresAt: newExpiresAt.toISOString() };
}

// ─── Cron: verificar e processar contas vencidas ───────────────────────────

export interface OverdueResult {
  movedToPastDue:  string[];   // restaurant ids
  suspended:       string[];   // restaurant ids
  reminders7d:     string[];   // restaurant ids
  reminders3d:     string[];   // restaurant ids
  reminders1d:     string[];   // restaurant ids
}

export async function checkAndProcessOverdue(): Promise<OverdueResult> {
  const now = new Date();
  const result: OverdueResult = {
    movedToPastDue: [], suspended: [],
    reminders7d: [], reminders3d: [], reminders1d: [],
  };

  const { data: restaurants } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, subscription_status, subscription_expires_at, grace_period_ends_at");

  if (!restaurants) return result;

  for (const r of restaurants) {
    const status    = r.subscription_status as SubscriptionStatus;
    const expiresAt = r.subscription_expires_at ? new Date(r.subscription_expires_at) : null;
    const graceEnd  = r.grace_period_ends_at    ? new Date(r.grace_period_ends_at)    : null;

    // Suspender contas em past_due com grace period expirado
    if (status === "past_due" && graceEnd && graceEnd < now) {
      await supabaseAdmin
        .from("restaurants")
        .update({ subscription_status: "suspended", is_active: false })
        .eq("id", r.id);
      result.suspended.push(r.id);
      continue;
    }

    // Mover contas expiradas para past_due
    if ((status === "active" || status === "trial") && expiresAt && expiresAt < now) {
      const graceEndsAt = addDays(now, GRACE_PERIOD_DAYS);
      await supabaseAdmin
        .from("restaurants")
        .update({ subscription_status: "past_due", grace_period_ends_at: graceEndsAt.toISOString() })
        .eq("id", r.id);
      result.movedToPastDue.push(r.id);
      continue;
    }

    // Lembretes de renovação (7d, 3d, 1d antes de expirar)
    if ((status === "active" || status === "trial") && expiresAt) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft === 7) result.reminders7d.push(r.id);
      if (daysLeft === 3) result.reminders3d.push(r.id);
      if (daysLeft === 1) result.reminders1d.push(r.id);
    }
  }

  return result;
}

// ─── Listar faturas de um restaurante ─────────────────────────────────────

export async function getInvoices(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("subscription_invoices")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
