import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    const { data: b, error: e } = await supabaseAdmin.from('orders').select('*').limit(1);
    console.log("Admin select orders:", b?.length);
    
    // Check what a regular logged in user would see
    // We need to simulate a login. We don't have user password, but we can verify anon.
    const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: anonOrders, error: ae } = await supabaseAnon.from('orders').select('id, status, restaurant_id').limit(5);
    console.log("Anon select orders:", anonOrders?.length, ae);

    // Let's create a SQL script to explicitly grant authenticated users full power over their restaurant.
}
checkPolicies();
