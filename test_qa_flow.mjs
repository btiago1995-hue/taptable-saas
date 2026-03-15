import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runHeavyAudit() {
    console.log("=== TAPTABLE END-TO-END QA AUDIT ===");
    
    // 1. Get a test restaurant
    const { data: rest, error: restErr } = await supabaseAnon.from('restaurants').select('id, name').limit(1).single();
    if (restErr || !rest) {
        console.error("❌ FAILED: Não foi possível obter o restaurante de teste.", restErr);
        return;
    }
    console.log(`✅ [Restaurante] Encontrado: ${rest.name} (${rest.id})`);

    // 2. Simulate Customer Checkout (Calling the RPC exactly as the frontend does)
    console.log(`\n⏳ [Cliente] Simular Finalização de Pedido (Checkout)...`);
    const mockOrderNumber = "QA" + Math.floor(Math.random() * 1000);
    const rpcPayload = {
        p_restaurant_id: rest.id,
        p_table_number: 10,
        p_subtotal: 100,
        p_tip: 0,
        p_total_amount: 100,
        p_status: "new",
        p_payment_method: "cash",
        p_payment_status: "pending",
        p_order_type: "in_store",
        p_customer_name: "QA Tester",
        p_customer_phone: "000000000",
        p_customer_nif: null,
        p_delivery_address: null,
        p_delivery_fee: 0,
        p_order_number: mockOrderNumber,
        p_items: [
            { menu_item_id: null, name: "QA Burger", price: 100, quantity: 1 }
        ]
    };

    const startTime = Date.now();
    const { data: orderId, error: rpcErr } = await supabaseAnon.rpc('place_new_order_transaction', rpcPayload);
    const endTime = Date.now();

    if (rpcErr) {
        console.error("❌ FAILED: RPC 'place_new_order_transaction' bloqueada ou com erro interno.", rpcErr);
        console.log("-> DIAGNÓSTICO: O frontend está a falhar porque a Base de Dados está a rejeitar o pacote atómico.");
        return;
    }
    console.log(`✅ [Backend] Pedido Atómico Inserido com Sucesso em ${endTime - startTime}ms. ID: ${orderId}`);

    // 3. Simulate Kitchen/Cashier Fetching Active Orders (RLS Check)
    console.log(`\n⏳ [Cozinha/Balcão] A verificar se o pedido aparece nos monitores dos funcionários...`);
    const { data: fetchedOrder, error: fetchErr } = await supabaseAnon
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

    if (fetchErr) {
        console.error("❌ FAILED: O KDS tentou puxar o pedido mas o Supabase bloqueou (Erro de Leitura/RLS).", fetchErr);
        return;
    }
    
    if (!fetchedOrder.order_items || fetchedOrder.order_items.length === 0) {
        console.error("❌ FAILED: O pedido chegou à cozinha, mas as Pizzas/Items desapareceram! (Transação não guardou os items).");
    } else {
        console.log(`✅ [KDS] O pedido ${fetchedOrder.order_number} apareceu na Cozinha com ${fetchedOrder.order_items.length} items!`);
    }

    console.log("\n✅ Auditoria Técnica do Fluxo de Pedidos concluída.");
}

runHeavyAudit();
