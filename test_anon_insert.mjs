import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: rest, error: errRest } = await supabase.from('restaurants').select('id').limit(1).single();
    if(errRest) {
        console.log("No restaurant", errRest); return;
    }
    const orderData = {
        restaurant_id: rest.id,
        table_number: 1,
        subtotal: 100,
        tip: 0,
        total_amount: 100,
        status: "new",
        payment_method: "cash",
        payment_status: "pending",
        order_type: "in_store",
        order_number: "TEST1"
    }
    
    console.log("Attempting insert order...");
    const { data, error } = await supabase.from('orders').insert([orderData]).select('id').single();
    if(error) {
        console.log("❌ ERROR INSERTING ORDER:", error);
    } else {
        console.log("✅ SUCCESS:", data);
        
        const itemData = {
            order_id: data.id,
            name: 'test pizza',
            price: 100,
            quantity: 1
        };
        const { data: itemDataRes, error: iErr } = await supabase.from('order_items').insert([itemData]);
        if (iErr) console.log("❌ ERROR INSERTING ITEM:", iErr);
        else console.log("✅ ITEM SUCCESS");
    }
}
test();
