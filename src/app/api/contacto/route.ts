import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, business_name, num_locations, message } = body;

    if (!name || !email || !business_name) {
      return NextResponse.json({ error: "Campos obrigatórios em falta" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("contact_leads").insert({
      name,
      email,
      phone: phone || null,
      business_name,
      num_locations: num_locations || 1,
      message: message || null,
    });

    if (error) {
      console.error("Contact lead insert error:", error);
      return NextResponse.json({ error: "Erro ao guardar contacto" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Lead guardado com sucesso" });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
