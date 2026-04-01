import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@tawsil.tn",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
