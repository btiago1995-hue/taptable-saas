/**
 * API Route: POST /api/efatura/iud
 *
 * Gera IUD, constrói XML, submete à DNRE e persiste resultado.
 * Se DNRE inacessível → guarda em efatura_pending_submission (modo offline).
 *
 * Body esperado:
 * {
 *   orderId: string;
 *   restaurantId: string;
 *   tipoDocumento?: "FS" | "FT" | "FR" | "GT";  // default: auto-determinado
 * }
 *
 * Resposta (sucesso):
 * {
 *   iud: string;           // 45 chars
 *   numeroDoc: string;     // ex: "FS 2026/00000001"
 *   hash: string;          // 22 chars
 *   dnreStatus: string;    // "authorized" | "offline" | "contingencia"
 *   dnreAutorizacao?: string;
 *   qrCodeUrl: string;     // URL para QR code no recibo
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  gerarIUD,
  determinarTipoDocumento,
  validarRegraLimiteNIF,
  type TipoDocumento,
} from "@/lib/efatura";
import { buildDocumentoXml, orderItemsParaDocumento } from "@/lib/efatura-xml";
import { submeterDocumentoDNREComRetry } from "@/lib/efatura-dnre";
import { gerarUrlVerificacaoIUD } from "@/lib/efatura-qrcode";
import {
  efaturaCredenciaisConfiguradas,
  EFATURA_IS_DEV,
} from "@/lib/efatura-constants";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // 1. Buscar dados do restaurante e do pedido em paralelo
    const [restaurantResult, orderResult] = await Promise.all([
      supabase
        .from("restaurants")
        .select("nif_number, name, address, city")
        .eq("id", restaurantId)
        .single(),
      supabase
        .from("orders")
        .select("id, total_amount, customer_nif, customer_name, order_type, created_at, iud, order_items(id, name, price, quantity)")
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
        numeroDoc: null,
        hash: null,
        already_exists: true,
        qrCodeUrl: gerarUrlVerificacaoIUD(order.iud),
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

    // 3. Validar regra 20.000 CVE
    const totalBruto = Math.round(order.total_amount);
    try {
      validarRegraLimiteNIF({
        totalBruto,
        customerNif: order.customer_nif,
        tipoDocumento,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    const ano = new Date(order.created_at).getFullYear();

    // 4. Obter próximo sequencial + hash anterior (atomicamente via RPC)
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

    // 5. Gerar IUD
    const resultado = await gerarIUD({
      nifEmitente: restaurante.nif_number,
      tipoDocumento,
      ano,
      numeroSequencial: proximo_sequencial,
      dataHoraEmissao: new Date(order.created_at),
      totalBruto,
      hashAnterior: hash_anterior || "0",
    });

    // 6. Construir XML do documento
    const orderItems = (order.order_items as any[]) || [];
    const items = orderItemsParaDocumento(orderItems);

    const xmlDocumento = buildDocumentoXml({
      iud: resultado.iud,
      tipoDocumento,
      numeroDoc: resultado.numeroDoc,
      numeroSequencial: proximo_sequencial,
      emitente: {
        nif: restaurante.nif_number,
        nome: restaurante.name || "Restaurante",
        morada: restaurante.address || "",
        cidade: restaurante.city || "Praia",
        pais: "CV",
      },
      destinatario: order.customer_nif
        ? { nif: order.customer_nif, nome: order.customer_name || "" }
        : null,
      items,
      totalBruto,
      dataHoraEmissao: new Date(order.created_at),
      hashDocumento: resultado.hash,
      hashAnterior: hash_anterior || "0",
    });

    // 7. Persistir IUD e hash no pedido
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        iud: resultado.iud,
        document_hash: resultado.hash,
        document_number: resultado.numeroDoc,
        document_type: tipoDocumento,
        dnre_status: "pending",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[E-Fatura] Erro ao persistir IUD:", updateError);
      return NextResponse.json(
        { error: "IUD gerado mas não foi possível persistir. Tente novamente." },
        { status: 500 }
      );
    }

    // 8. Actualizar hash da série
    await supabase.rpc("efatura_update_last_hash", {
      p_restaurant_id: restaurantId,
      p_tipo_documento: tipoDocumento,
      p_ano: ano,
      p_hash: resultado.hash,
    });

    // 9. Submeter à DNRE (ou guardar offline se credenciais não configuradas / dev)
    let dnreStatus = "pending";
    let dnreAutorizacao: string | undefined;

    if (!EFATURA_IS_DEV && efaturaCredenciaisConfiguradas()) {
      const respostaDNRE = await submeterDocumentoDNREComRetry(xmlDocumento);

      if (respostaDNRE.autorizado) {
        dnreStatus = "authorized";
        dnreAutorizacao = respostaDNRE.codigoAutorizacao;

        await supabase
          .from("orders")
          .update({
            dnre_status: "authorized",
            dnre_autorizacao: dnreAutorizacao,
            dnre_submitted_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      } else {
        // DNRE inacessível → guardar para sync offline
        dnreStatus = "offline";
        await _guardarPendente({
          orderId,
          restaurantId,
          iud: resultado.iud,
          tipoDocumento,
          numeroDoc: resultado.numeroDoc,
          xmlDocumento,
          modo: "offline",
          erro: respostaDNRE.erro,
        });

        await supabase
          .from("orders")
          .update({ dnre_status: "offline" })
          .eq("id", orderId);
      }
    } else if (EFATURA_IS_DEV) {
      // Desenvolvimento: não submeter, marcar como pending
      console.log(`[E-Fatura DEV] IUD gerado: ${resultado.iud} — submissão DNRE desactivada (EFATURA_ENV=dev)`);
      dnreStatus = "pending";
    } else {
      // Credenciais não configuradas → offline
      dnreStatus = "offline";
      await _guardarPendente({
        orderId,
        restaurantId,
        iud: resultado.iud,
        tipoDocumento,
        numeroDoc: resultado.numeroDoc,
        xmlDocumento,
        modo: "offline",
        erro: "Credenciais DNRE não configuradas",
      });
      await supabase
        .from("orders")
        .update({ dnre_status: "offline" })
        .eq("id", orderId);
    }

    return NextResponse.json({
      iud: resultado.iud,
      numeroDoc: resultado.numeroDoc,
      hash: resultado.hash,
      tipoDocumento,
      sequencial: proximo_sequencial,
      dnreStatus,
      dnreAutorizacao,
      qrCodeUrl: gerarUrlVerificacaoIUD(resultado.iud),
    });
  } catch (err) {
    console.error("[E-Fatura] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: guardar documento na fila offline
// ---------------------------------------------------------------------------

async function _guardarPendente(params: {
  orderId: string;
  restaurantId: string;
  iud: string;
  tipoDocumento: string;
  numeroDoc: string;
  xmlDocumento: string;
  modo: "offline" | "contingencia";
  erro?: string;
}): Promise<void> {
  const { error } = await supabase.from("efatura_pending_submission").upsert(
    {
      order_id: params.orderId,
      restaurant_id: params.restaurantId,
      iud: params.iud,
      tipo_documento: params.tipoDocumento,
      numero_doc: params.numeroDoc,
      xml_documento: params.xmlDocumento,
      modo: params.modo,
      ultimo_erro: params.erro || null,
    },
    { onConflict: "order_id" }
  );

  if (error) {
    console.error("[E-Fatura] Erro ao guardar pendente:", error);
  }
}
