import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    // Authenticate from the cookie/header
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const authHeader = req.headers.get("authorization");
    if (authHeader) supabaseAuth.auth.setSession({ access_token: authHeader.replace("Bearer ", ""), refresh_token: "" });

    const { data: { user: sessionUser } } = await supabaseAuth.auth.getUser();

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Parâmetros year e month inválidos" }, { status: 400 });
    }

    // Get restaurant from JWT
    let restaurantId: string | null = null;
    if (sessionUser) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("restaurant_id, restaurants(subscription_plan, name, nif_number, address)")
        .eq("id", sessionUser.id)
        .single();
      restaurantId = profile?.restaurant_id || null;

      // Check plan
      const plan = (profile?.restaurants as any)?.subscription_plan || "starter";
      if (!["pro"].includes(plan)) {
        return NextResponse.json({ error: "Plano PRO necessário para exportar SAF-T" }, { status: 403 });
      }
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Fetch restaurant details
    const { data: restaurant } = await supabaseAdmin
      .from("restaurants")
      .select("name, nif_number, address, city, country")
      .eq("id", restaurantId)
      .single();

    // Fetch orders for the period
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .in("status", ["delivered", "completed", "paid"]);

    // Generate SAF-T XML (adapted for CV/DNRE based on SAF-T PT structure)
    const xml = generateSaftXml({
      restaurant: restaurant || { name: "Restaurante", nif_number: "000000000", address: "" },
      orders: orders || [],
      year,
      month,
    });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="SAF-T-${year}-${String(month).padStart(2, "0")}.xml"`,
      },
    });
  } catch (error) {
    console.error("SAF-T export error:", error);
    return NextResponse.json({ error: "Erro interno ao gerar SAF-T" }, { status: 500 });
  }
}

function generateSaftXml({ restaurant, orders, year, month }: {
  restaurant: any;
  orders: any[];
  year: number;
  month: number;
}) {
  const totalVendas = orders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
  const numOrders = orders.length;

  const invoiceLines = orders.map((order: any, idx: number) => {
    const items = order.order_items || [];
    return `
    <Invoice>
      <InvoiceNo>FT2025/${String(idx + 1).padStart(4, "0")}</InvoiceNo>
      <InvoiceDate>${order.created_at?.split("T")[0] || ""}</InvoiceDate>
      <InvoiceType>FT</InvoiceType>
      <SpecialRegimes>
        <SelfBillingIndicator>0</SelfBillingIndicator>
      </SpecialRegimes>
      <SourceID>DINEO</SourceID>
      <DocumentTotals>
        <TaxPayable>0</TaxPayable>
        <NetTotal>${(Number(order.total) || 0).toFixed(2)}</NetTotal>
        <GrossTotal>${(Number(order.total) || 0).toFixed(2)}</GrossTotal>
      </DocumentTotals>
      ${items.map((item: any, i: number) => `
      <Line>
        <LineNumber>${i + 1}</LineNumber>
        <ProductCode>${item.menu_item_id || "ITEM"}</ProductCode>
        <ProductDescription>${(item.name || "Produto").replace(/&/g, "&amp;")}</ProductDescription>
        <Quantity>${item.quantity || 1}</Quantity>
        <UnitPrice>${(Number(item.unit_price) || Number(item.price) || 0).toFixed(2)}</UnitPrice>
        <CreditAmount>${((Number(item.unit_price) || Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}</CreditAmount>
      </Line>`).join("")}
    </Invoice>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_2.04">
  <Header>
    <AuditFileVersion>1.01_01</AuditFileVersion>
    <CompanyID>${restaurant.nif_number || "000000000"}</CompanyID>
    <TaxRegistrationNumber>${restaurant.nif_number || "000000000"}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${(restaurant.name || "Restaurante").replace(/&/g, "&amp;")}</CompanyName>
    <CompanyAddress>
      <AddressDetail>${(restaurant.address || "").replace(/&/g, "&amp;")}</AddressDetail>
      <City>${(restaurant.city || "Praia").replace(/&/g, "&amp;")}</City>
      <PostalCode>0000-000</PostalCode>
      <Country>CV</Country>
    </CompanyAddress>
    <FiscalYear>${year}</FiscalYear>
    <StartDate>${year}-${String(month).padStart(2, "0")}-01</StartDate>
    <EndDate>${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}</EndDate>
    <CurrencyCode>CVE</CurrencyCode>
    <DateCreated>${new Date().toISOString().split("T")[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyTaxID>Dineo by Servyx</ProductCompanyTaxID>
    <SoftwareCertificateNumber>0</SoftwareCertificateNumber>
    <ProductID>Dineo SaaS</ProductID>
    <ProductVersion>1.0</ProductVersion>
  </Header>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${numOrders}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalVendas.toFixed(2)}</TotalCredit>
      ${invoiceLines}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;
}
