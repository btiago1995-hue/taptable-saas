import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use ANON key to mimic frontend completely
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function debugFlow() {
    console.log("=== STARTING DIAGNOSTIC FLOW ===");
    
    const restId = '639f56a7-8e17-4dd3-97f1-0bf213b146bd'; // Assuming Pinky_Brunch for test

    // 1. Subscribe to channel FIRST
    const channel = supabase.channel(`realtime_orders_${restId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            console.log("🔔 REALTIME EVENT RECEIVED:", payload.eventType, payload.new?.id);
        })
        .subscribe(async (status) => {
            console.log("Channel Status:", status);
            
            if (status === 'SUBSCRIBED') {
                // 2. Perform exactly what placeOrder does
                const newOrderData = {
                    restaurant_id: restId,
                    table_number: 10,
                    subtotal: 10,
                    tip: 0,
                    total_amount: 10,
                    status: "new",
                    payment_method: "cash",
                    payment_status: "pending",
                    order_type: "in_store",
                    order_number: "DEBUG123"
                };
                
                console.log("-> Inserting Order...");
                const { data: order, error: orderErr } = await supabase.from('orders').insert([newOrderData]).select('id').single();
                if (orderErr) {
                    console.error("❌ Order Insert Error:", orderErr);
                    process.exit(1);
                }
                console.log("✅ Order Inserted:", order.id);

                console.log("-> Inserting Items...");
                const { error: itemsErr } = await supabase.from('order_items').insert([{
                    order_id: order.id,
                    name: 'Debug Pizza',
                    price: 10,
                    quantity: 1
                }]);
                if (itemsErr) {
                     console.error("❌ Items Insert Error:", itemsErr);
                } else {
                     console.log("✅ Items Inserted");
                }
                
                // wait to see if realtime catches it
                setTimeout(() => {
                    console.log("Finished waiting for realtime events.");
                    process.exit(0);
                }, 5000);
            }
        });
}
debugFlow();
