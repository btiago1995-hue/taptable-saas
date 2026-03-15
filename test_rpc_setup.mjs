import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deployRpc() {
    console.log("Creating RPC function for atomic order placement...");
    // we use a sql string to inject
    // wait I can just use a raw test file
}
