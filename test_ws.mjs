import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRpcAndWebsockets() {
    console.log("=== Testing RPC ===");
    const t0 = performance.now();
    try {
        const res = await supabase.rpc('increment_loyalty_stars', {
            p_restaurant_id: '639f56a7-8e17-4dd3-97f1-0bf213b146bd',
            p_phone_number: '123456789',
            p_name: 'Test',
            p_stars_to_add: 1
        });
        console.log("RPC Response:", res, `in ${(performance.now() - t0).toFixed(2)}ms`);
    } catch (e) {
        console.error("RPC Error:", e);
    }
    
    console.log("=== Testing Websocket Subscription ===");
    const channel = supabase.channel('realtime_orders_639f56a7-8e17-4dd3-97f1-0bf213b146bd')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            console.log('🔥 ORDER EVENT RECEIVED:', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
            console.log('🍕 ITEM EVENT RECEIVED:', payload);
        })
        .subscribe((status) => {
             console.log("Subscription Status:", status);
             if (status === 'SUBSCRIBED') {
                 console.log("Inserting test order to trigger WS...");
                 supabase.from('orders').insert([{
                     restaurant_id: '639f56a7-8e17-4dd3-97f1-0bf213b146bd',
                     table_number: 1, subtotal: 10, tip: 0, total_amount: 10,
                     status: "new", payment_method: "cash", payment_status: "pending",
                     order_type: "delivery", order_number: "WS1"
                 }]).then(({data, error}) => {
                     if (error) console.log("Insert Error:", error);
                 });
             }
        });
        
    setTimeout(() => {
        console.log("Closing test...");
        process.exit(0);
    }, 5000);
}
testRpcAndWebsockets();
