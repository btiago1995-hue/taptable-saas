/**
 * API Route: POST /api/efatura/iud
 *
 * Gera e persiste um IUD E-Fatura para um pedido.
 * O sequencial é incrementado atomicamente no Supabase para evitar duplicados.
 *
 * Body esperado:
 * {
 *   orderId: string;
 *   restaurantId: string;
 *   tipoDocumento?: "FS" | "FT" | "FR" | "GT";  // default: "FS"
 * }
 *
 * Resposta:
 * {
 *   iud: string;         // 45 chars
 *   numeroDoc: string;   // ex: "FS 2026/00000001"
 *   hash: string;        // 22 chars — para cadeia do próximo doc
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  gerarIUD,
  determinarTipoDocumento,
  type TipoDocumento,
} from "@/lib/efatura";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Chave de serviço — apenas server-side
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, restaurantId, tipoDocumento: tipoParam } = body;

    if (!orderId || !restaurantId) {
      return NextResponse.json(
        { error: "orderId e restaurantId são obrigatórios" },
        { status: 400 }
      );
    }

    // 1. Buscar dados do restaurante (NIF) e do pedido
    const [restaurantResult, orderResult] = await Promise.all([
      supabase
        .from("restaurants")
        .select("nif_number, name")
        .eq("id", restaurantId)
        .single(),
      supabase
        .from("orders")
        .select("id, total_amount, customer_nif, order_type, created_at, iud")
        .eq("id", orderId)
        .single(),
    ]);

    if (restaurantResult.error || !restaurantResult.data) {
      return NextResponse.json({ error: "Restaurante não encontrado" }, { status: 404 });
    }
    if (orderResult.error || !orderResult.data) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    const restaurante = restaurantResult.data;
    const order = orderResult.data;

    // Idempotência: se o pedido já tem IUD, retornar o existente
    if (order.iud) {
      return NextResponse.json({
        iud: order.iud,
        numeroDoc: null, // já persistido anteriormente
        hash: null,
        already_exists: true,
      });
    }

    if (!restaurante.nif_number) {
      return NextResponse.json(
        { error: "Restaurante sem NIF configurado. Configure o NIF nas Definições antes de emitir documentos fiscais." },
        { status: 422 }
      );
    }

    // 2. Determinar tipo de documento
    const tipoDocumento: TipoDocumento =
      tipoParam ||
      determinarTipoDocumento({
        customerNif: order.customer_nif,
        isDelivery: order.order_type === "delivery",
      });

    const ano = new Date(order.created_at).getFullYear();

    // 3. Obter o último sequencial + hash da série (atomicamente via RPC)
    //    A função Supabase incrementa o contador e retorna o próximo valor.
    const { data: seqData, error: seqError } = await supabase.rpc(
      "efatura_next_sequence",
      {
        p_restaurant_id: restaurantId,
        p_tipo_documento: tipoDocumento,
        p_ano: ano,
      }
    );

    if (seqError) {
      console.error("[E-Fatura] Erro ao obter sequencial:", seqError);
      return NextResponse.json(
        { error: "Erro ao gerar sequencial do documento. Contacte o suporte." },
        { status: 500 }
      );
    }

    const { proximo_sequencial, hash_anterior } = seqData as {
      proximo_sequencial: number;
      hash_anterior: string;
    };

    // 4. Gerar o IUD
    const resultado = await gerarIUD({
      nifEmitente: restaurante.nif_number,
      tipoDocumento,
      ano,
      numeroSequencial: proximo_sequencial,
      dataHoraEmissao: new Date(order.created_at),
      totalBruto: Math.round(order.total_amount),
      hashAnterior: hash_anterior || "0",
    });

    // 5. Persistir IUD, hash e número do documento no pedido
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        iud: resultado.iud,
        document_hash: resultado.hash,
        document_number: resultado.numeroDoc,
        document_type: tipoDocumento,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[E-Fatura] Erro ao persistir IUD:", updateError);
      return NextResponse.json(
        { error: "IUD gerado mas não foi possível persistir. Tente novamente." },
        { status: 500 }
      );
    }

    // 6. Actualizar o hash mais recente da série para o próximo documento
    const { error: hashError } = await supabase.rpc("efatura_update_last_hash", {
      p_restaurant_id: restaurantId,
      p_tipo_documento: tipoDocumento,
      p_ano: ano,
      p_hash: resultado.hash,
    });

    if (hashError) {
      // Log crítico — a sequência está em risco. Não reverter o IUD (já emitido),
      // mas alertar para intervenção manual.
      console.error("[E-Fatura] CRÍTICO: IUD emitido mas hash da série não actualizado.", {
        orderId,
        iud: resultado.iud,
        hash: resultado.hash,
        error: hashError,
      });
      // Retornar sucesso com aviso — o IUD é válido, mas a série precisa de verificação
      return NextResponse.json({
        iud: resultado.iud,
        numeroDoc: resultado.numeroDoc,
        hash: resultado.hash,
        tipoDocumento,
        sequencial: proximo_sequencial,
        warning: "IUD emitido. Verifique a integridade da série manualmente.",
      });
    }

    return NextResponse.json({
      iud: resultado.iud,
      numeroDoc: resultado.numeroDoc,
      hash: resultado.hash,
      tipoDocumento,
      sequencial: proximo_sequencial,
    });
  } catch (err) {
    console.error("[E-Fatura] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
