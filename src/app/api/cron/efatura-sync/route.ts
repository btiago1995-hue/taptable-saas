/**
 * GET /api/cron/efatura-sync
 *
 * Cron job para sincronizar documentos E-Fatura offline com a DNRE.
 * Deve ser chamado a cada 30-60 minutos pelo Vercel Cron ou equivalente.
 *
 * Configurar em vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/efatura-sync", "schedule": "0 * * * *" }]
 * }
 *
 * Protegido por CRON_SECRET para evitar chamadas não autorizadas.
 */

import { NextRequest, NextResponse } from "next/server";
import { sincronizarPendentesDNRE } from "@/lib/efatura-offline";
import { EFATURA_IS_DEV } from "@/lib/efatura-constants";

export async function GET(req: NextRequest) {
  // Verificar autorização do cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Em desenvolvimento, apenas logar sem submeter
  if (EFATURA_IS_DEV) {
    return NextResponse.json({
      message: "EFATURA_ENV=dev — sync desactivado em desenvolvimento",
      sincronizados: 0,
    });
  }

  try {
    const resultado = await sincronizarPendentesDNRE();

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      ...resultado,
    });
  } catch (err: any) {
    console.error("[E-Fatura Sync Cron] Erro:", err);
    return NextResponse.json(
      { error: "Erro no sync E-Fatura", detalhe: err.message },
      { status: 500 }
    );
  }
}
