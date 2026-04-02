import { getSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const riderId = searchParams.get("id");
  if (!riderId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: allDelivered } = await supabase
    .from("orders")
    .select("id, created_at")
    .eq("rider_id", riderId)
    .eq("status", "delivered");

  const all = allDelivered || [];
  const todayDelivered = all.filter(o => new Date(o.created_at) >= today);

  return NextResponse.json({
    totalDelivered: all.length,
    todayDelivered: todayDelivered.length,
    totalEarnings: all.length * 1500,
    todayEarnings: todayDelivered.length * 1500,
  });
}
