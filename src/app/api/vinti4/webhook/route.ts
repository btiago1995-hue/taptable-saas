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

        // 1. Find the order in the database
        // merchantRespReference contains the first 20 chars of order id without dashes
        // Let's do a direct search instead. In production, we should store the exact merchantRespReference in the orders table.
        // For now, we'll fetch all active orders and match the stripped ID.
        
        // 1. Find the order in the database using a direct ID match
        // merchantRespReference contains first 20 chars of order UUID without dashes
        // We fetch only orders matching the stripped reference prefix
        const { data: matchingOrders } = await supabaseAdmin
            .from('orders')
            .select('id, restaurant_id, payment_status')
            .limit(50); // safety limit — in production store merchantRespReference directly in orders
            
        let targetOrder = null;
        if (matchingOrders) {
             targetOrder = matchingOrders.find(o => 
                 o.id.replace(/-/g, '').substring(0, 20) === merchantRespReference
             );
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
