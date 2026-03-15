import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function simulateCheckout() {
    console.log("=== CHECKOUT SIMULATION ===");
    const finalRestId = '639f56a7-8e17-4dd3-97f1-0bf213b146bd';
    const orderNumber = "TEST1";
    
    // Simulate what placeOrder does
    const newOrderData = {
        restaurant_id: finalRestId,
        table_number: 1,
        subtotal: 10,
        tip: 0,
        total_amount: 10,
        status: "new",
        payment_method: "cash",
        payment_status: "pending",
        order_type: "delivery",
        order_number: orderNumber
    };

    console.time("Order Insert Time");
    const { data: insertedOrder, error: orderErr } = await supabase.from('orders').insert([newOrderData]).select('id').single();
    console.timeEnd("Order Insert Time");

    if (orderErr) {
        console.error("Order Insert Failed:", orderErr);
        return;
    }

    console.log("Order Inserted:", insertedOrder.id);
    
    const items = [ { id: 'test-item', name: 'Test Pizza', price: 10, quantity: 1 } ];
    const orderItemsData = items.map(item => ({
        order_id: insertedOrder.id,
        menu_item_id: null,
        name: item.name,
        price: item.price,
        quantity: item.quantity
    }));

    console.time("Items Insert Time");
    const { error: itemErr } = await supabase.from('order_items').insert(orderItemsData);
    console.timeEnd("Items Insert Time");
    
    if (itemErr) {
        console.error("Items Insert Failed:", itemErr);
    } else {
        console.log("Items Inserted!");
    }
}
simulateCheckout();
