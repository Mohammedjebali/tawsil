import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { subscription, rider_name, rider_phone } = await req.json();
  const supabase = getSupabase();
  await supabase.from("push_subscriptions").insert({ subscription, rider_name, rider_phone });
  return NextResponse.json({ ok: true });
}
