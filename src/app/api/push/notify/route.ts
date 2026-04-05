import { captureError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import webpush from "web-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@tawsil.tn",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: NextRequest) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Push notifications not configured" }, { status: 503 });
  }
  try {
    const { order_number, store_name, delivery_fee } = await req.json();
    const supabase = getSupabase();
    const { data: subs } = await supabase.from("push_subscriptions").select("subscription");

    const payload = JSON.stringify({
      title: "🛵 طلب جديد!",
      body: `من ${store_name} — توصيل ${(delivery_fee / 1000).toFixed(3)} DT`,
      data: { order_number },
    });

    await Promise.allSettled(
      (subs || []).map((s) => webpush.sendNotification(s.subscription, payload))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    captureError(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
