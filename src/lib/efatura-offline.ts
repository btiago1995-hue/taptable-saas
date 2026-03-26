/**
 * efatura-offline.ts
 *
 * Gestão do modo offline E-Fatura.
 * Quando a DNRE não está acessível, os documentos são guardados em
 * efatura_pending_submission e sincronizados pelo cron /api/cron/efatura-sync.
 *
 * Regras DNRE:
 *   - Prazo máximo para sync: 7 dias
 *   - Após 7 dias → transição para modo Contingência
 *   - Modo Contingência: numeração prefixada "C-", sync obrigatório quando DNRE volta
 */

import { createClient } from "@supabase/supabase-js";
import { submeterDocumentoDNREComRetry } from "./efatura-dnre";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PendingSubmission {
  id: string;
  order_id: string;
  restaurant_id: string;
  iud: string;
  tipo_documento: string;
  numero_doc: string;
  xml_documento: string;
  modo: "offline" | "contingencia";
  tentativas: number;
  ultimo_erro: string | null;
  criado_em: string;
  prazo_max: string;
  ultima_tentativa: string | null;
}

export interface SyncResult {
  total: number;
  sincronizados: number;
  falhados: number;
  passadosParaContingencia: number;
  erros: { orderId: string; erro: string }[];
}

// ---------------------------------------------------------------------------
// Sync de documentos pendentes
// ---------------------------------------------------------------------------

/**
 * Sincroniza todos os documentos offline pendentes com a DNRE.
 * Chamado pelo cron /api/cron/efatura-sync.
 *
 * Lógica:
 *   1. Buscar todos os pendentes não sincronizados
 *   2. Documentos com prazo_max ultrapassado → mover para contingência
 *   3. Tentar submeter os restantes à DNRE
 *   4. Sucesso → marcar como sincronizado + actualizar order.dnre_status
 *   5. Falha → incrementar tentativas + registar erro
 */
export async function sincronizarPendentesDNRE(): Promise<SyncResult> {
  const resultado: SyncResult = {
    total: 0,
    sincronizados: 0,
    falhados: 0,
    passadosParaContingencia: 0,
    erros: [],
  };

  // Buscar pendentes não sincronizados
  const { data: pendentes, error } = await supabase
    .from("efatura_pending_submission")
    .select("*")
    .is("sincronizado_em", null)
    .order("criado_em", { ascending: true });

  if (error) {
    console.error("[E-Fatura Sync] Erro ao buscar pendentes:", error);
    return resultado;
  }

  if (!pendentes || pendentes.length === 0) {
    return resultado;
  }

  resultado.total = pendentes.length;
  const agora = new Date();

  for (const pendente of pendentes as PendingSubmission[]) {
    // Verificar se o prazo expirou → mover para contingência
    if (new Date(pendente.prazo_max) < agora && pendente.modo !== "contingencia") {
      await supabase
        .from("efatura_pending_submission")
        .update({ modo: "contingencia" })
        .eq("id", pendente.id);

      await supabase
        .from("orders")
        .update({ dnre_status: "contingencia" })
        .eq("id", pendente.order_id);

      resultado.passadosParaContingencia++;
      console.warn(
        `[E-Fatura Sync] Documento ${pendente.iud} passou para modo CONTINGÊNCIA (prazo expirado: ${pendente.prazo_max})`
      );
      continue;
    }

    // Tentar submeter à DNRE
    try {
      const respostaDNRE = await submeterDocumentoDNREComRetry(pendente.xml_documento);

      if (respostaDNRE.autorizado) {
        // Sucesso: marcar como sincronizado
        await supabase
          .from("efatura_pending_submission")
          .update({ sincronizado_em: new Date().toISOString() })
          .eq("id", pendente.id);

        await supabase
          .from("orders")
          .update({
            dnre_status: "authorized",
            dnre_autorizacao: respostaDNRE.codigoAutorizacao,
            dnre_submitted_at: new Date().toISOString(),
          })
          .eq("id", pendente.order_id);

        resultado.sincronizados++;
        console.log(`[E-Fatura Sync] ✓ ${pendente.iud} autorizado (${respostaDNRE.codigoAutorizacao})`);
      } else {
        // Falha: incrementar tentativas
        await supabase
          .from("efatura_pending_submission")
          .update({
            tentativas: pendente.tentativas + 1,
            ultima_tentativa: new Date().toISOString(),
            ultimo_erro: respostaDNRE.erro || "Erro desconhecido",
          })
          .eq("id", pendente.id);

        resultado.falhados++;
        resultado.erros.push({
          orderId: pendente.order_id,
          erro: respostaDNRE.erro || "Erro desconhecido",
        });
        console.warn(`[E-Fatura Sync] ✗ ${pendente.iud}: ${respostaDNRE.erro}`);
      }
    } catch (err: any) {
      // Erro de rede — DNRE ainda inacessível
      await supabase
        .from("efatura_pending_submission")
        .update({
          tentativas: pendente.tentativas + 1,
          ultima_tentativa: new Date().toISOString(),
          ultimo_erro: err.message,
        })
        .eq("id", pendente.id);

      resultado.falhados++;
      resultado.erros.push({ orderId: pendente.order_id, erro: err.message });
    }
  }

  console.log(
    `[E-Fatura Sync] Concluído: ${resultado.sincronizados}/${resultado.total} sincronizados, ` +
    `${resultado.falhados} falhados, ${resultado.passadosParaContingencia} → contingência`
  );

  return resultado;
}

// ---------------------------------------------------------------------------
// Estatísticas de pendentes (para dashboard admin)
// ---------------------------------------------------------------------------

export interface EstatisticasPendentes {
  total: number;
  offline: number;
  contingencia: number;
  expiramEm24h: number;
}

/**
 * Retorna estatísticas dos documentos pendentes de um restaurante.
 * Usar no dashboard admin para alertar o utilizador.
 */
export async function obterEstatisticasPendentes(
  restaurantId: string
): Promise<EstatisticasPendentes> {
  const { data } = await supabase
    .from("efatura_pending_submission")
    .select("modo, prazo_max")
    .eq("restaurant_id", restaurantId)
    .is("sincronizado_em", null);

  if (!data) return { total: 0, offline: 0, contingencia: 0, expiramEm24h: 0 };

  const agora = new Date();
  const em24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

  return {
    total: data.length,
    offline: data.filter((d) => d.modo === "offline").length,
    contingencia: data.filter((d) => d.modo === "contingencia").length,
    expiramEm24h: data.filter(
      (d) => d.modo === "offline" && new Date(d.prazo_max) < em24h
    ).length,
  };
}
