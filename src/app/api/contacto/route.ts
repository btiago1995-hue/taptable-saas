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

    // Enviar emails de confirmação (fire-and-forget)
    const { sendContactLeadConfirmation, sendContactLeadInternal } = await import("@/lib/email");
    sendContactLeadConfirmation({ to: email, name, businessName: business_name })
      .catch(err => console.error("[contacto] Erro email cliente:", err));
    sendContactLeadInternal({ name, email, phone: phone || null, businessName: business_name, numLocations: num_locations || 1, message: message || null })
      .catch(err => console.error("[contacto] Erro email interno:", err));

    return NextResponse.json({ success: true, message: "Lead guardado com sucesso" });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
