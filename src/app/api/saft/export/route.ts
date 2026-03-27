import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { EFATURA_SW_CODE } from "@/lib/efatura-constants";

export async function GET(req: NextRequest) {
  try {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      supabaseAuth.auth.setSession({
        access_token: authHeader.replace("Bearer ", ""),
        refresh_token: "",
      });
    }

    const { data: { user: sessionUser } } = await supabaseAuth.auth.getUser();

    const { searchParams } = new URL(req.url);
    const year  = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Parâmetros year e month inválidos" }, { status: 400 });
    }

    // Auth + plan gate
    let restaurantId: string | null = null;
    if (sessionUser) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("restaurant_id, restaurants(subscription_plan, name, nif_number, address)")
        .eq("id", sessionUser.id)
        .single();

      restaurantId = profile?.restaurant_id || null;
      const plan = (profile?.restaurants as any)?.subscription_plan || "starter";
      if (!["pro"].includes(plan)) {
        return NextResponse.json({ error: "Plano PRO necessário para exportar SAF-T" }, { status: 403 });
      }
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Restaurant details
    const { data: restaurant } = await supabaseAdmin
      .from("restaurants")
      .select("name, nif_number, address, city, country")
      .eq("id", restaurantId)
      .single();

    // Orders for the period (only delivered/paid)
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate   = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, created_at, total_amount, subtotal, delivery_fee, payment_method, payment_status, customer_name, customer_nif, order_type, iud, document_hash, document_number, document_type, order_items(id, name, price, quantity)")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .eq("status", "delivered");

    const xml = generateSaftXml({
      restaurant: restaurant || { name: "Restaurante", nif_number: "000000000", address: "", city: "Praia", country: "CV" },
      orders: orders || [],
      year,
      month,
      swCode: EFATURA_SW_CODE,
    });

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="SAF-T-${year}-${String(month).padStart(2, "0")}.xml"`,
      },
    });
  } catch (error) {
    console.error("[SAF-T] Export error:", error);
    return NextResponse.json({ error: "Erro interno ao gerar SAF-T" }, { status: 500 });
  }
}

// ─── XML Generator ───────────────────────────────────────────────────────────

function esc(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateSaftXml({
  restaurant,
  orders,
  year,
  month,
  swCode,
}: {
  restaurant: any;
  orders: any[];
  year: number;
  month: number;
  swCode: string;
}) {
  const lastDay  = new Date(year, month, 0).getDate();
  const dateCreated = new Date().toISOString().split("T")[0];
  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDateStr   = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // Totals — use total_amount (includes delivery fee)
  const totalCredit = orders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

  // Invoice counter — per-month sequential starting at 1
  const invoiceLines = orders.map((order, idx) => {
    const items      = order.order_items || [];
    const total      = Number(order.total_amount) || 0;
    // Usar número do documento E-Fatura se disponível, senão fallback sequencial
    const invoiceNum = order.document_number || `FS ${year}/${String(idx + 1).padStart(4, "0")}`;
    const invoiceDate = (order.created_at || "").split("T")[0];

    // Usar tipo do documento E-Fatura se disponível
    const docType = order.document_type || (order.customer_nif ? "FT" : "FS");

    // Usar IUD real do documento (se gerado), senão "0"
    const docHash = order.iud || order.document_hash || "0";

    const lineItems = items.map((item: any, i: number) => {
      const unitPrice  = Number(item.price) || 0;
      const qty        = Number(item.quantity) || 1;
      const lineTotal  = unitPrice * qty;
      return `
        <Line>
          <LineNumber>${i + 1}</LineNumber>
          <ProductCode>${esc(item.id?.substring(0, 30) || "ITEM")}</ProductCode>
          <ProductDescription>${esc(item.name || "Produto")}</ProductDescription>
          <Quantity>${qty.toFixed(2)}</Quantity>
          <UnitPrice>${unitPrice.toFixed(2)}</UnitPrice>
          <CreditAmount>${lineTotal.toFixed(2)}</CreditAmount>
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>CV</TaxCountryRegion>
            <TaxCode>ISE</TaxCode>
            <TaxPercentage>0</TaxPercentage>
          </Tax>
        </Line>`;
    }).join("");

    const customerBlock = order.customer_name
      ? `
      <CustomerID>${esc(order.customer_nif || "CONSUMIDOR-FINAL")}</CustomerID>`
      : `
      <CustomerID>CONSUMIDOR-FINAL</CustomerID>`;

    return `
    <Invoice>
      <InvoiceNo>${esc(invoiceNum)}</InvoiceNo>
      <DocumentStatus>
        <InvoiceStatus>N</InvoiceStatus>
        <InvoiceStatusDate>${invoiceDate}T00:00:00</InvoiceStatusDate>
        <SourceID>DINEO</SourceID>
        <SourceBilling>P</SourceBilling>
      </DocumentStatus>
      <Hash>${esc(docHash)}</Hash>
      <Period>${month}</Period>
      <InvoiceDate>${invoiceDate}</InvoiceDate>
      <InvoiceType>${docType}</InvoiceType>
      <SpecialRegimes>
        <SelfBillingIndicator>0</SelfBillingIndicator>
      </SpecialRegimes>
      <SourceID>DINEO</SourceID>
      <SystemEntryDate>${order.created_at?.replace("Z", "") || invoiceDate + "T00:00:00"}</SystemEntryDate>${customerBlock}
      ${lineItems}
      <DocumentTotals>
        <TaxPayable>0.00</TaxPayable>
        <NetTotal>${total.toFixed(2)}</NetTotal>
        <GrossTotal>${total.toFixed(2)}</GrossTotal>
      </DocumentTotals>
    </Invoice>`;
  }).join("\n");

  // Namespace CV — a confirmar com XSD oficial da DNRE (passo 0.7)
  // TODO: substituir pelo namespace exacto após obter XSD
  return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:cv:efatura:saft:v1">
  <Header>
    <AuditFileVersion>1.0</AuditFileVersion>
    <CompanyID>${esc(restaurant.nif_number || "000000000")}</CompanyID>
    <TaxRegistrationNumber>${esc(restaurant.nif_number || "000000000")}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${esc(restaurant.name || "Restaurante")}</CompanyName>
    <CompanyAddress>
      <AddressDetail>${esc(restaurant.address || "")}</AddressDetail>
      <City>${esc(restaurant.city || "Praia")}</City>
      <PostalCode>0000-000</PostalCode>
      <Country>${esc(restaurant.country || "CV")}</Country>
    </CompanyAddress>
    <FiscalYear>${year}</FiscalYear>
    <StartDate>${startDateStr}</StartDate>
    <EndDate>${endDateStr}</EndDate>
    <CurrencyCode>CVE</CurrencyCode>
    <DateCreated>${dateCreated}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyTaxID>Dineo by Servyx Labs</ProductCompanyTaxID>
    <SoftwareCertificateNumber>${esc(swCode)}</SoftwareCertificateNumber>
    <ProductID>Dineo SaaS</ProductID>
    <ProductVersion>1.0</ProductVersion>
  </Header>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${orders.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalCredit.toFixed(2)}</TotalCredit>
      ${invoiceLines}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;
}
