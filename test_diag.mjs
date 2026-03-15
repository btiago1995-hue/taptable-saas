import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

dotenv.config({ path: '.env.local' });

const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runDiagnostics() {
    console.log("=== TAPTABLE DIAGNOSTICS ===");

    // 1. Fetch a restaurant
    const { data: rest, error: errRest } = await supabaseAnon.from('restaurants').select('id, name').limit(1).single();
    if (errRest || !rest) {
        console.error("❌ Failed to fetch restaurant:", errRest);
        return;
    }
    console.log(`✅ Using Restaurant: ${rest.name} (${rest.id})`);

    // 2. Measure Checkout / Insert Speed
    const orderData = {
        restaurant_id: rest.id,
        table_number: 99,
        subtotal: 50,
        tip: 0,
        total_amount: 50,
        status: "new",
        payment_method: "cash",
        payment_status: "pending",
        order_type: "delivery",
        order_number: "DIAG" + Math.floor(Math.random()*1000)
    };

    console.log("⏳ Simulating order placement (ANON)...");
    const t0 = performance.now();
    const { data: insertedOrder, error: insErr } = await supabaseAnon.from('orders').insert([orderData]).select('id').single();
    const t1 = performance.now();
    
    if (insErr) {
        console.error("❌ Order Insert Failed:", insErr);
    } else {
        console.log(`✅ Order Inserted in ${(t1 - t0).toFixed(2)}ms. ID: ${insertedOrder.id}`);
        
        // 3. Measure Order Items Insert
        const itemData = {
            order_id: insertedOrder.id,
            name: "Diagnostic Pizza",
            price: 50,
            quantity: 1
        };
        const t2 = performance.now();
        const { error: itemErr } = await supabaseAnon.from('order_items').insert([itemData]);
        const t3 = performance.now();
        if (itemErr) {
            console.error("❌ Order Item Insert Failed:", itemErr);
        } else {
            console.log(`✅ Order Item Inserted in ${(t3 - t2).toFixed(2)}ms.`);
        }

        // 4. Test RLS for Kitchen Updates (we will use ANON since we don't have login context here, but let's see if update works)
        const { error: updErr } = await supabaseAnon.from('orders').update({ status: 'preparing' }).eq('id', insertedOrder.id);
        if (updErr) {
            console.error("❌ Order Update Failed (ANON):", updErr.message);
        } else {
             console.log("✅ Order Update Succeeded (ANON)");
        }
    }

    // 5. Test get policies
    console.log("\n=== Checking RLS Policies ===");
    const { data: policies, error: polErr } = await supabaseAdmin.from('pg_policies').select('*').eq('tablename', 'orders').catch(() => ({ data: null, error: 'No access' }));
    if (policies) {
        policies.forEach(p => console.log(`- ${p.policyname} (${p.cmd})`));
    } else {
         console.log("Could not read pg_policies directly.");
    }
}

runDiagnostics();
