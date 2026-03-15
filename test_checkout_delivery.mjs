import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function simulateFrontendDelivery() {
    console.log("=== CHECKOUT PAYLOAD SIMULATOR ===");
    
    const restId = '639f56a7-8e17-4dd3-97f1-0bf213b146bd'; 
    const newOrderData = {
        restaurant_id: restId,
        table_number: 0,
        subtotal: 10,
        tip: 0,
        total_amount: 10,
        status: "new",
        payment_method: "card",
        payment_status: "paid",
        order_type: "delivery",
        customer_name: "Tiago Test",
        customer_phone: "912345678",
        delivery_address: "Rua X",
        delivery_fee: 0,
        order_number: "DELIV1"
    };
    
    console.log("-> Inserting Order...");
    const { data: order, error: orderErr } = await supabase.from('orders').insert([newOrderData]).select('id').single();
    if (orderErr) {
        console.error("❌ Order Insert Error:", orderErr);
        process.exit(1);
    }
    console.log("✅ Order Inserted:", order.id);
}
simulateFrontendDelivery();
