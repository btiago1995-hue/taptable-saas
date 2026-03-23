import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/reports/export?year=2025&month=3&type=sales|items|payments
 * Exports a CSV report for the authenticated restaurant.
 * type=sales    → one row per order
 * type=items    → one row per order item (top products)
 * type=payments → aggregated by payment method
 */

async function getRestaurantId(req: NextRequest): Promise<string | null> {
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
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("users").select("restaurant_id").eq("id", user.id).single();
  return profile?.restaurant_id || null;
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: any[][]): string {
  const lines = [headers.map(escapeCSV).join(",")];
  for (const row of rows) lines.push(row.map(escapeCSV).join(","));
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await getRestaurantId(req);
    if (!restaurantId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year  = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const type  = searchParams.get("type") || "sales";

    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate   = new Date(year, month, 0, 23, 59, 59).toISOString();

    const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const periodLabel = `${MONTHS_PT[month - 1]}_${year}`;

    if (type === "sales") {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("order_number, created_at, status, order_type, payment_method, payment_status, subtotal, tip, delivery_fee, total_amount, customer_name, customer_nif, table_number")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: true });

      const headers = ["Nº Pedido","Data","Hora","Estado","Tipo","Pagamento","Estado Pagamento","Subtotal","Gorjeta","Taxa Entrega","Total","Cliente","NIF","Mesa"];
      const rows = (orders || []).map(o => {
        const d = new Date(o.created_at);
        return [
          o.order_number || "",
          d.toLocaleDateString("pt-CV"),
          d.toLocaleTimeString("pt-CV", { hour: "2-digit", minute: "2-digit" }),
          o.status,
          o.order_type,
          o.payment_method,
          o.payment_status,
          Number(o.subtotal || 0).toFixed(2),
          Number(o.tip || 0).toFixed(2),
          Number(o.delivery_fee || 0).toFixed(2),
          Number(o.total_amount || 0).toFixed(2),
          o.customer_name || "",
          o.customer_nif || "",
          o.table_number || "",
        ];
      });
      const csv = toCSV(headers, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="vendas_${periodLabel}.csv"`,
        },
      });
    }

    if (type === "items") {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("name, price, quantity, orders!inner(restaurant_id, created_at, status)")
        .eq("orders.restaurant_id", restaurantId)
        .gte("orders.created_at", startDate)
        .lte("orders.created_at", endDate);

      // Aggregate by item name
      const agg: Record<string, { qty: number; revenue: number }> = {};
      for (const item of items || []) {
        const key = item.name || "Desconhecido";
        if (!agg[key]) agg[key] = { qty: 0, revenue: 0 };
        agg[key].qty += Number(item.quantity || 1);
        agg[key].revenue += Number(item.price || 0) * Number(item.quantity || 1);
      }
      const sorted = Object.entries(agg).sort((a, b) => b[1].qty - a[1].qty);
      const headers = ["Produto","Qtd Vendida","Receita (CVE)"];
      const rows = sorted.map(([name, v]) => [name, v.qty, v.revenue.toFixed(2)]);
      const csv = toCSV(headers, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="produtos_${periodLabel}.csv"`,
        },
      });
    }

    if (type === "payments") {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("payment_method, payment_status, total_amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      const agg: Record<string, { count: number; total: number; paid: number }> = {};
      for (const o of orders || []) {
        const key = o.payment_method || "desconhecido";
        if (!agg[key]) agg[key] = { count: 0, total: 0, paid: 0 };
        agg[key].count++;
        agg[key].total += Number(o.total_amount || 0);
        if (o.payment_status === "paid") agg[key].paid += Number(o.total_amount || 0);
      }
      const headers = ["Método","Nº Pedidos","Total (CVE)","Total Pago (CVE)","Total Pendente (CVE)"];
      const rows = Object.entries(agg).map(([method, v]) => [
        method,
        v.count,
        v.total.toFixed(2),
        v.paid.toFixed(2),
        (v.total - v.paid).toFixed(2),
      ]);
      const csv = toCSV(headers, rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pagamentos_${periodLabel}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Tipo inválido. Use: sales, items, payments" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
