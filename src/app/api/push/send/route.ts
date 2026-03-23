import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import webpush from "web-push";

/**
 * POST /api/push/send
 * Sends a push notification to all subscribers of a restaurant.
 * Called fire-and-forget from placeOrder (storefront) after order creation.
 * Body: { restaurantId, title, body, url?, tag? }
 */
export async function POST(req: NextRequest) {
  try {
    const { restaurantId, title, body, url, tag } = await req.json();
    if (!restaurantId) return NextResponse.json({ error: "restaurantId obrigatório" }, { status: 400 });

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ skipped: true });
    }

    webpush.setVapidDetails(
      "mailto:suporte@dineo.cv",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("restaurant_id", restaurantId);

    if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

    const payload = JSON.stringify({ title, body, url: url || "/admin/kitchen", tag: tag || "dineo-order" });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async err => {
          // 410 Gone = subscription expired, clean up
          if (err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          throw err;
        })
      )
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
