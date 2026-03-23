import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * PATCH /api/superadmin/restaurants/[id]
 * Mutações de superadmin sobre um restaurante (bypass RLS via supabaseAdmin).
 *
 * Body (todos opcionais — actualiza apenas os campos presentes):
 *   is_active?: boolean
 *   subscription_plan?: string
 *   subscription_expires_at?: string  (ISO date)
 *   subscription_status?: string
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
    }

    const body = await req.json();

    // Whitelist de campos permitidos — nunca aceitar campos arbitrários
    const allowed = [
      "is_active",
      "subscription_plan",
      "subscription_expires_at",
      "subscription_status",
    ] as const;

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nenhum campo válido para actualizar." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("restaurants")
      .update(update)
      .eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[superadmin/restaurants/[id]] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
