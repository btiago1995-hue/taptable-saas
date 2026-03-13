import { NextRequest, NextResponse } from "next/server";
import { generateVinti4Fingerprint } from "@/lib/vinti4";
import { supabase } from "@/lib/supabaseClient";

/**
 * POST /api/vinti4/checkout
 * Generates the Vinti4Net form parameters and returns them to the frontend
 * so the frontend can auto-submit an HTML form to SISP.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId, amount, restaurantId } = body;

        if (!orderId || !amount || !restaurantId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch the Restaurant's Vinti4 Credentials
        const { data: rest, error: restErr } = await supabase
            .from('restaurants')
            .select('vinti4_pos_id, vinti4_pos_aut_code')
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
        const timeStamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHmmss format needed by SISP
        // Vinti4 expects amount in cents or full numbers depending on config. We assume full CVE here, but it's often passed as string.
        const amountStr = Math.round(Number(amount)).toString(); 
        const merchantRef = orderId.replace(/-/g, '').substring(0, 20); // Vinti4 ref is usually max 20 chars
        const merchantSession = "SESS_" + Date.now().toString(); // Random session tracking string
        const currency = "132"; // ISO Numeric Code for CVE (Escudo Cabo-verdiano)
        const transactionCode = "1"; // 1 = Compra normal 3DS

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

        // 4. Return the data payload. The frontend will take this and build an invisible 
        // HTML form that automatically submits via POST to the Vinti4 platform.
        return NextResponse.json({
            success: true,
            actionUrl: "https://www.vinti4net.cv/pes/index.jsf", // Production URL standard. (Test URL might be different based on SISP manual)
            formData: {
                posID: POS_ID,
                merchantRef: merchantRef,
                merchantSession: merchantSession,
                amount: amountStr,
                currency: currency,
                transactionCode: transactionCode,
                timeStamp: timeStamp,
                fingerprint: fingerprint,
                urlMerchantResponse: `${process.env.NEXT_PUBLIC_SITE_URL}/api/vinti4/webhook`,
            }
        });

    } catch (err: any) {
        console.error("Vinti4 Checkout Error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}
