/**
 * planGate.ts — Sistema Central de Gating por Plano
 *
 * Uso:
 *   const { allowed, requiredPlan } = usePlanGate('kds');
 *   if (!allowed) router.push(`/admin/upgrade?feature=kds`);
 */

export type PlanId = "starter" | "growth" | "pro";

// ─── Mapa de features por plano ──────────────────────────────────────────────
// Cada plano herda as features do anterior.
const STARTER_FEATURES = [
  "pos",
  "menu_qr",
  "tables",
  "cashier",
  "dashboard",
  "waiter",
] as const;

const GROWTH_FEATURES = [
  ...STARTER_FEATURES,
  "kds",
  "delivery",
  "driver",
  "analytics",
  "customers",
  "conta_corrente",
  "sisp",
  "loyalty",
] as const;

const PRO_FEATURES = [
  ...GROWTH_FEATURES,
  "saft",
  "retencoes",
  "multi_store",
  "unlimited_users",
] as const;

export type Feature =
  | (typeof STARTER_FEATURES)[number]
  | (typeof GROWTH_FEATURES)[number]
  | (typeof PRO_FEATURES)[number];

export const PLAN_FEATURES: Record<PlanId, readonly string[]> = {
  starter: STARTER_FEATURES,
  growth: GROWTH_FEATURES,
  pro: PRO_FEATURES,
};

// Descrições de planos (para UI)
export const PLAN_INFO: Record<PlanId, { label: string; price: Record<string, number> }> = {
  starter: {
    label: "Starter",
    price: { monthly: 1490, quarterly: 3990, annual: 14900 },
  },
  growth: {
    label: "Growth",
    price: { monthly: 2990, quarterly: 7990, annual: 29900 },
  },
  pro: {
    label: "PRO",
    price: { monthly: 5990, quarterly: 15990, annual: 59900 },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns whether a plan includes a given feature */
export function hasFeature(plan: PlanId | string | undefined, feature: Feature): boolean {
  const safePlan = normalizePlan(plan);
  return PLAN_FEATURES[safePlan]?.includes(feature) ?? false;
}

/** Returns list of all features for a given plan */
export function getPlanFeatures(plan: PlanId | string | undefined): readonly string[] {
  return PLAN_FEATURES[normalizePlan(plan)] ?? PLAN_FEATURES.starter;
}

/** Returns the minimum plan required for a feature */
export function getRequiredPlan(feature: Feature): PlanId {
  if (STARTER_FEATURES.includes(feature as any)) return "starter";
  if (GROWTH_FEATURES.includes(feature as any)) return "growth";
  return "pro";
}

/** Normalizes legacy plan names to new ids */
export function normalizePlan(plan: string | undefined): PlanId {
  if (!plan) return "starter";
  // Map legacy values
  if (plan === "essencial") return "starter";
  if (plan === "elite") return "pro";
  if (plan === "starter" || plan === "growth" || plan === "pro") return plan;
  return "starter";
}

// ─── React Hook ───────────────────────────────────────────────────────────────

import { useAuth } from "@/lib/AuthContext";

/**
 * Hook to check if the current user's plan allows a feature.
 * @returns { allowed: boolean, requiredPlan: PlanId }
 */
export function usePlanGate(feature: Feature): { allowed: boolean; requiredPlan: PlanId } {
  const { user } = useAuth();
  const plan = normalizePlan(user?.restaurantData?.subscriptionPlan);
  const allowed = hasFeature(plan, feature);
  const requiredPlan = getRequiredPlan(feature);
  return { allowed, requiredPlan };
}
