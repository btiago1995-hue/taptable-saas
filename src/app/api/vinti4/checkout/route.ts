import { NextRequest, NextResponse } from "next/server";
import { generateVinti4Fingerprint } from "@/lib/vinti4";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/vinti4/checkout
 * Generates the Vinti4Net form parameters and returns them to the frontend
 * so the frontend can auto-submit an HTML form to SISP.
 *
 * Body:
 *   orderId     — UUID de uma order real (pagamento de mesa/delivery)
 *   amount      — valor em CVE
 *   restaurantId — UUID do restaurante
 *   b2bSaaSPayment? — true quando é pagamento de subscrição SaaS (sem order real)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId, amount, restaurantId, b2bSaaSPayment } = body;

        if (!amount || !restaurantId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!b2bSaaSPayment && !orderId) {
            return NextResponse.json({ error: "orderId é obrigatório para pagamentos de mesa." }, { status: 400 });
        }

        // 1. Fetch the Restaurant's Vinti4 Credentials
        const { data: rest, error: restErr } = await supabaseAdmin
            .from('restaurants')
            .select('vinti4_pos_id, vinti4_pos_aut_code, subscription_plan, subscription_billing')
            .eq('id', restaurantId)
            .single();

        if (restErr || !rest || !rest.vinti4_pos_id || !rest.vinti4_pos_aut_code) {
            return NextResponse.json({
                error: "Este restaurante ainda não configurou o pagamento online Vinti4."
            }, { status: 400 });
        }

        const POS_ID = rest.vinti4_pos_id;
        const POS_AUT_CODE = rest.vinti4_pos_aut_code;

        // 2. Prepare Transaction Data
        const timeStamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const amountStr = Math.round(Number(amount)).toString();
        const merchantSession = "SESS_" + Date.now().toString();
        const currency = "132"; // CVE
        const transactionCode = "1"; // Compra normal

        let merchantRef: string;

        if (b2bSaaSPayment) {
            // ── SaaS subscription payment ──────────────────────────────────────
            // merchant_ref format: "sub_<first16charsOfRestaurantId>"
            // This allows the webhook to identify it as a SaaS payment and look up
            // the pending invoice in subscription_invoices.
            const shortId = restaurantId.replace(/-/g, '').substring(0, 16);
            merchantRef = `sub_${shortId}`; // exactly 20 chars

            // Create a pending invoice — the webhook will mark it paid
            const plan  = rest.subscription_plan  || 'starter';
            const cycle = rest.subscription_billing || 'monthly';
            await supabaseAdmin
                .from('subscription_invoices')
                .insert([{
                    restaurant_id:     restaurantId,
                    amount:            Number(amount),
                    plan,
                    billing_cycle:     cycle,
                    status:            'pending',
                    due_date:          new Date().toISOString(),
                    payment_reference: merchantRef,
                }]);
        } else {
            // ── Regular order payment ──────────────────────────────────────────
            merchantRef = orderId.replace(/-/g, '').substring(0, 20);

            // Persist the merchantRef in orders for webhook lookup
            await supabaseAdmin
                .from('orders')
                .update({ merchant_ref: merchantRef })
                .eq('id', orderId);
        }

        // 3. Generate Security Fingerprint
        const fingerprint = generateVinti4Fingerprint({
            posAutCode: POS_AUT_CODE,
            timeStamp,
            amount: amountStr,
            merchantRef,
            merchantSession,
            posID: POS_ID,
            currency,
            transactionCode,
        });

        // 4. Build webhook URL dynamically from request headers
        const xForwardedHost = req.headers.get('x-forwarded-host');
        const origin = xForwardedHost
            ? `https://${xForwardedHost}`
            : req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
        const webhookUrl = `${origin}/api/vinti4/webhook`;

        return NextResponse.json({
            success: true,
            actionUrl: "https://www.vinti4net.cv/pes/index.jsf",
            formData: {
                posID: POS_ID,
                merchantRef,
                merchantSession,
                amount: amountStr,
                currency,
                transactionCode,
                timeStamp,
                fingerprint,
                urlMerchantResponse: webhookUrl,
            }
        });

    } catch (err: any) {
        console.error("Vinti4 Checkout Error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
