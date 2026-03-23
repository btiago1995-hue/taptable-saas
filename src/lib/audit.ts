/**
 * audit.ts — Log de Auditoria
 *
 * Regista acções críticas na tabela audit_logs.
 * Fire-and-forget: nunca bloqueia a resposta ao cliente.
 *
 * Usar apenas em API routes (server-side) com supabaseAdmin.
 *
 * Acções padrão:
 *   payment.confirmed | payment.failed
 *   subscription.activated | subscription.suspended | subscription.cancelled
 *   plan.changed | trial.extended
 *   staff.created | staff.deleted | staff.role_changed
 *   order.closed | order.refunded
 *   settings.updated
 *   account.created | account.deleted (soft)
 */

import { supabaseAdmin } from "@/lib/supabase";

export interface AuditParams {
  restaurantId?: string | null;
  userId?:       string | null;
  action:        string;          // ex: 'payment.confirmed'
  entity:        string;          // ex: 'order', 'subscription', 'user'
  entityId?:     string | null;
  metadata?:     Record<string, unknown>;
  ipAddress?:    string | null;
}

export function logAudit(params: AuditParams): void {
  // Fire-and-forget: não usar await — nunca deve bloquear a resposta
  supabaseAdmin
    .from("audit_logs")
    .insert({
      restaurant_id: params.restaurantId ?? null,
      user_id:       params.userId       ?? null,
      action:        params.action,
      entity:        params.entity,
      entity_id:     params.entityId     ?? null,
      metadata:      params.metadata     ?? {},
      ip_address:    params.ipAddress    ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[audit] Erro ao registar log:", error.message, params.action);
    });
}
