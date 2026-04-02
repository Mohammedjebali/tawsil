import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("store_name");
    if (error) throw error;

    const map: Record<string, number> = {};
    for (const o of orders || []) {
      map[o.store_name] = (map[o.store_name] || 0) + 1;
    }

    const stats = Object.entries(map).map(([store_name, order_count]) => ({ store_name, order_count }));
    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
