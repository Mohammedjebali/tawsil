import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("customer_phone, status, delivery_fee, created_at");
    if (error) throw error;

    const map: Record<string, { total_orders: number; delivered_orders: number; total_spent_millimes: number; last_order_at: string | null }> = {};
    for (const o of orders || []) {
      const phone = o.customer_phone;
      if (!map[phone]) {
        map[phone] = { total_orders: 0, delivered_orders: 0, total_spent_millimes: 0, last_order_at: null };
      }
      map[phone].total_orders++;
      if (o.status === "delivered") {
        map[phone].delivered_orders++;
        map[phone].total_spent_millimes += o.delivery_fee || 0;
      }
      if (!map[phone].last_order_at || o.created_at > map[phone].last_order_at!) {
        map[phone].last_order_at = o.created_at;
      }
    }

    const stats = Object.entries(map).map(([phone, s]) => ({ phone, ...s }));
    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
