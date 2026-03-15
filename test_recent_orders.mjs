import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRecentOrders() {
    console.log("Fetching last 5 orders from DB...");
    const { data: orders, error } = await supabaseAdmin
        .from('orders')
        .select('id, restaurant_id, order_type, created_at, status, order_number')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (error) console.error("Error", error);
    else console.log(orders);
}

checkRecentOrders();
