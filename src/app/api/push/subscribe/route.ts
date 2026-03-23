import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/push/subscribe
 * Saves a Web Push subscription for the authenticated user's restaurant.
 * Body: { subscription: PushSubscriptionJSON }
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      supabaseAuth.auth.setSession({
        access_token: authHeader.replace("Bearer ", ""),
        refresh_token: "",
      });
    }
    const { data: { user: sessionUser } } = await supabaseAuth.auth.getUser();
    if (!sessionUser) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("restaurant_id")
      .eq("id", sessionUser.id)
      .single();

    if (!profile?.restaurant_id) return NextResponse.json({ error: "Sem restaurante" }, { status: 400 });

    const { subscription } = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ error: "Subscription inválida" }, { status: 400 });

    await supabaseAdmin
      .from("push_subscriptions")
      .upsert({
        restaurant_id: profile.restaurant_id,
        user_id: sessionUser.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      }, { onConflict: "endpoint" });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Removes a push subscription (on logout or permission revoke).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (endpoint) {
      await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
