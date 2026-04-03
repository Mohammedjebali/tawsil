import { getSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const riderId = searchParams.get("id");
  const riderPhone = searchParams.get("phone");
  if (!riderId && !riderPhone) return NextResponse.json({ error: "Missing id or phone" }, { status: 400 });

  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let query = supabase
    .from("orders")
    .select("id, created_at")
    .eq("status", "delivered");

  // Prefer phone lookup since rider_id FK points to auth.users not riders table
  if (riderPhone) {
    query = query.eq("rider_phone", riderPhone);
  } else {
    query = query.eq("rider_id", riderId);
  }

  const { data: allDelivered } = await query;

  const all = allDelivered || [];
  const todayDelivered = all.filter(o => new Date(o.created_at) >= today);

  return NextResponse.json({
    totalDelivered: all.length,
    todayDelivered: todayDelivered.length,
    totalEarnings: all.length * 1500,
    todayEarnings: todayDelivered.length * 1500,
  });
}
