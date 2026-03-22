import { NextRequest, NextResponse } from "next/server";
import { verifyVinti4Response } from "@/lib/vinti4";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/vinti4/webhook
 * Handles the silent server-to-server callback from SISP Vinti4Net
 */
export async function POST(req: NextRequest) {
    try {
        // Vinti4 typically sends form data (application/x-www-form-urlencoded)
        const formData = await req.formData();
        
        const messageType = formData.get("messageType") as string;
        const merchantRespCP = formData.get("merchantRespCP") as string;
        const merchantRespTid = formData.get("merchantRespTid") as string;
        const merchantRespMessageID = formData.get("merchantRespMessageID") as string;
        const merchantRespReference = formData.get("merchantRespReference") as string;
        const merchantRespPan = formData.get("merchantRespPan") as string;
        const merchantResp = formData.get("merchantResp") as string;
        const merchantRespTimeStamp = formData.get("merchantRespTimeStamp") as string;
        const resultFingerPrint = formData.get("resultFingerPrint") as string;

        // Vinti4 Reference usually max 20, we mapped it to the uuid prefix. We need the full order to get posAutCode.
        // We do a LIKE query to find the order if merchantRespReference is a substring.
        // But for safety, we should really pass the restaurant ID somehow, or we query orders by substring.
        
        if (!merchantRespReference) {
             return NextResponse.json({ error: "Missing reference" }, { status: 400 });
        }

        // 1. Find the order in the database using a direct merchant_ref lookup
        // merchantRespReference matches the merchant_ref column stored at checkout time
        const { data: matchingOrders } = await supabaseAdmin
            .from('orders')
            .select('id, restaurant_id, payment_status, merchant_ref')
            .eq('merchant_ref', merchantRespReference);

        let targetOrder = null;
        if (matchingOrders && matchingOrders.length > 0) {
             targetOrder = matchingOrders[0];
        }

        if (!targetOrder) {
            console.error("Vinti4 Webhook: Order not found for ref", merchantRespReference);
             // Always return 200 to SISP so they don't retry endlessly
             return NextResponse.json({ success: true });
        }

        // 2. Fetch the Restaurant's Secrets to test the Fingerprint
        const { data: rest } = await supabaseAdmin
            .from('restaurants')
            .select('vinti4_pos_aut_code')
            .eq('id', targetOrder.restaurant_id)
            .single();
            
        if (!rest || !rest.vinti4_pos_aut_code) {
             console.error("Vinti4 Webhook: Restaurant Auth Code not found");
             return NextResponse.json({ success: true });
        }

        // 3. Verify the Cryptographic Hash
        const isValid = verifyVinti4Response({
            posAutCode: rest.vinti4_pos_aut_code,
            messageType,
            merchantRespCP,
            merchantRespTid,
            merchantRespMessageID,
            merchantRespReference,
            merchantRespPan,
            merchantResp,
            merchantRespTimeStamp,
            providedFingerprint: resultFingerPrint,
        });

        if (!isValid) {
             console.error("Vinti4 Webhook: INVALID FINGERPRINT. Possible Fraud.");
             return NextResponse.json({ success: true }); // Return 200 so SISP shuts up, but we ignore the payload
        }

        // 3a. Idempotência — se já está pago, ignorar duplicado
        if (targetOrder.payment_status === 'paid') {
            console.log(`Vinti4 Webhook: Order ${targetOrder.id} already paid, ignoring duplicate.`);
            return NextResponse.json({ success: true });
        }

        // 3b. Validação de timestamp — rejeitar replays com mais de 10 minutos
        const tsStr = merchantRespTimeStamp;
        if (tsStr && tsStr.length === 14) {
            const year = parseInt(tsStr.slice(0, 4));
            const month = parseInt(tsStr.slice(4, 6)) - 1;
            const day = parseInt(tsStr.slice(6, 8));
            const hour = parseInt(tsStr.slice(8, 10));
            const min = parseInt(tsStr.slice(10, 12));
            const sec = parseInt(tsStr.slice(12, 14));
            const tsDate = new Date(Date.UTC(year, month, day, hour, min, sec));
            const diffMs = Date.now() - tsDate.getTime();
            if (diffMs > 10 * 60 * 1000) { // 10 minutos
                console.warn(`Vinti4 Webhook: Timestamp demasiado antigo (${diffMs}ms). Possível replay.`);
                return NextResponse.json({ success: true }); // 200 para SISP não retentar
            }
        }

        // 4. Process the Status
        // merchantResp is usually a concatenated string or JSON. The exact structure 
        // depends on the SISP manual. For the sake of this implementation, if merchantRespCP === "0", it's usually accepted.
        // Or if merchantResp inside has "000" for success. We'll check the CP code.
        
        if (merchantRespCP === "0") { // 0 usually means Application accepted / success

             // Update the order in the database to paid!
             await supabaseAdmin
                 .from('orders')
                 .update({ payment_status: 'paid' })
                 .eq('id', targetOrder.id);

             console.log(`Vinti4 Webhook: Order ${targetOrder.id} successfully PAID via Vinti4Net!`);

             // Gerar IUD E-Fatura (fire-and-forget — não impede a resposta ao SISP)
             const baseUrl = new URL(req.url).origin;
             fetch(`${baseUrl}/api/efatura/iud`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ orderId: targetOrder.id, restaurantId: targetOrder.restaurant_id }),
             }).catch(err => console.error('[E-Fatura] Erro ao gerar IUD Vinti4:', err));
        } else {
             console.log(`Vinti4 Webhook: Payment failed or declined. CP: ${merchantRespCP}`);
        }

        // Reply to SISP
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Vinti4 Webhook Global Error:", err);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
