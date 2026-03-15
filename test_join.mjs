import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testJoinQuery() {
    console.log("=== Testing JOIN Fetch ===");
    const { data: orders, error } = await supabaseAnon.from('orders').select('*, order_items(*)').limit(1);
    
    if (error) {
         console.error("❌ Join Query Error:", error);
    } else {
         console.log("✅ Join Query Success! Got data:", JSON.stringify(orders, null, 2));
    }
}
testJoinQuery();
