import { NextRequest, NextResponse } from "next/server";
import { getInvoices } from "@/lib/billing";

/**
 * GET /api/billing/invoices?restaurantId=xxx
 * Lista faturas de um restaurante (superadmin only via supabaseAdmin)
 */
export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId é obrigatório." }, { status: 400 });
    }

    const invoices = await getInvoices(restaurantId);
    return NextResponse.json({ invoices });

  } catch (err: any) {
    console.error("[billing/invoices] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
