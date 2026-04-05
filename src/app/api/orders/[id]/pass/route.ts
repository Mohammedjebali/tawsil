import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureApiError } from "@/lib/sentry";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabase();
  const { id } = await params;
  const { rider_id } = await req.json();

  if (!rider_id) {
    captureApiError("Missing rider_id", 400, { order_id: id });
    return NextResponse.json({ error: "Missing rider_id" }, { status: 400 });
  }

  // Record the pass
  await supabase.from("order_passes").insert({ order_id: id, rider_id });

  // Increment pass_count and flag if >= 3
  const { data: order } = await supabase
    .from("orders")
    .select("pass_count")
    .eq("id", id)
    .single();

  const newCount = (order?.pass_count || 0) + 1;
  await supabase
    .from("orders")
    .update({ pass_count: newCount, flagged: newCount >= 3 })
    .eq("id", id);

  return NextResponse.json({ passed: true, pass_count: newCount, flagged: newCount >= 3 });
}
