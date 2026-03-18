import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Helper function to send WhatsApp via generic provider (like Z-API or Evolution API)
async function sendWhatsAppMessage(phone: string, text: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;

    if (!apiUrl || !apiToken) {
        console.warn(`[WhatsApp webhook] MOCK SEND: No API credentials found. Message intending for ${phone}: ${text}`);
        return { success: true, mocked: true };
    }

    try {
        const response = await fetch(`${apiUrl}/message/sendText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}` // Or apikey depending on provider
            },
            body: JSON.stringify({
                number: phone,
                text: text
            })
        });

        if (!response.ok) {
            throw new Error(`Provider responded with status ${response.status}`);
        }

        return { success: true };
    } catch (error) {
        console.error("[WhatsApp webhook] Error sending message:", error);
        return { success: false, error };
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { orderId, newStatus } = body;

        if (!orderId || !newStatus) {
            return NextResponse.json({ error: 'Missing orderId or newStatus' }, { status: 400 });
        }

        // 1. Fetch Order Details from Supabase
        const { data: order, error } = await supabase
            .from('orders')
            .select('*, restaurants(name)')
            .eq('id', orderId)
            .single();

        if (error || !order) {
            console.error("Order not found or db error:", error);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // If it's not a delivery or pickup with a phone number, we don't send SMS
        if (!order.customer_phone) {
            return NextResponse.json({ message: 'No customer phone attached to order, skipping.' }, { status: 200 });
        }

        const restaurantName = order.restaurants?.name || "TapTable Parceiro";
        const shortOrderId = order.id.substring(0, 8).toUpperCase();
        let messageText = "";

        // 2. Format the message depending on the status
        switch (newStatus) {
            case 'preparing':
                messageText = `Olá! O seu pedido #${shortOrderId} no restaurante *${restaurantName}* foi aceite e está a ser preparado. 👨‍🍳🔥`;
                break;
            case 'ready':
                if (order.order_type === 'delivery') {
                    messageText = `Atenção! O seu pedido #${shortOrderId} está pronto e a caminho! 🚚💨 Prepare-se para receber.`;
                } else if (order.order_type === 'pickup') {
                    messageText = `O seu pedido #${shortOrderId} está pronto! 🛍️ Já pode vir levantar no balcão do *${restaurantName}*.`;
                } else {
                    messageText = `O seu pedido #${shortOrderId} está pronto para ser servido! 🍽️`;
                }
                break;
            default:
                // We don't send messages for other statuses to avoid spam
                return NextResponse.json({ message: `Ignored status: ${newStatus}` }, { status: 200 });
        }

        // 3. Send via Provider
        const result = await sendWhatsAppMessage(order.customer_phone, messageText);

        if (!result.success) {
            return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
        }

        return NextResponse.json({ success: true, mocked: result.mocked });

    } catch (error: any) {
        console.error("Webhook WhatsApp Error:", error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
}
