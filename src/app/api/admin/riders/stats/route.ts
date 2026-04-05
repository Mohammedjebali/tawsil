import { captureError } from "@/lib/sentry";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("rider_phone, status, delivered_at")
      .eq("status", "delivered")
      .not("rider_phone", "is", null);
    if (error) throw error;

    const map: Record<string, { total_deliveries: number; total_earned: number; last_delivery_at: string | null }> = {};
    for (const o of orders || []) {
      const phone = o.rider_phone;
      if (!phone) continue;
      if (!map[phone]) {
        map[phone] = { total_deliveries: 0, total_earned: 0, last_delivery_at: null };
      }
      map[phone].total_deliveries++;
      map[phone].total_earned += 1000;
      if (o.delivered_at && (!map[phone].last_delivery_at || o.delivered_at > map[phone].last_delivery_at!)) {
        map[phone].last_delivery_at = o.delivered_at;
      }
    }

    const stats = Object.entries(map).map(([phone, s]) => ({ phone, ...s }));
    return NextResponse.json({ stats });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
