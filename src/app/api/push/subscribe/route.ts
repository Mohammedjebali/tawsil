import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { subscription, rider_name, rider_phone, customer_phone } = await req.json();
  const supabase = getSupabase();
  const row: Record<string, unknown> = { subscription };
  if (rider_name) row.rider_name = rider_name;
  if (rider_phone) row.rider_phone = rider_phone;
  if (customer_phone) row.customer_phone = customer_phone;
  await supabase.from("push_subscriptions").insert(row);
  return NextResponse.json({ ok: true });
}
