import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRealtime() {
    const { data: q2, error: e2 } = await supabase.rpc('check_realtime_status')
        .catch(() => ({ data: null, error: 'No RPC' }));
    
    // We can just query pg_publication_tables using query directly if we made an API or we can just try to add it.
    console.log("To turn on realtime for a table in Supabase via SQL:");
    console.log("alter publication supabase_realtime add table orders;");
    console.log("alter publication supabase_realtime add table order_items;");
}
checkRealtime();
