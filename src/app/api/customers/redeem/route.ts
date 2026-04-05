import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

const TIERS: Record<number, { points: number; label_en: string }> = {
  100: { points: 100, label_en: "Sim recharge 5 DT" },
  200: { points: 200, label_en: "Gift card 10 DT" },
};

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const { customer_id, tier } = await req.json();

  if (!customer_id || !tier || !TIERS[tier]) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const required = TIERS[tier].points;

  // Get current points
  const { data: customer, error: cErr } = await supabase
    .from("customers")
    .select("id, points")
    .eq("id", customer_id)
    .single();

  if (cErr || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if ((customer.points || 0) < required) {
    return NextResponse.json({ error: "Not enough points" }, { status: 400 });
  }

  // Deduct points
  const newPoints = (customer.points || 0) - required;
  const { error: updErr } = await supabase
    .from("customers")
    .update({ points: newPoints })
    .eq("id", customer_id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Create redemption record
  const { data: redemption, error: rErr } = await supabase
    .from("redemptions")
    .insert({
      customer_id,
      tier,
      label: TIERS[tier].label_en,
      points_spent: required,
      status: "pending",
    })
    .select()
    .single();

  if (rErr) {
    // Rollback points
    await supabase.from("customers").update({ points: customer.points }).eq("id", customer_id);
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  // Log in points_history
  await supabase.from("points_history").insert({
    customer_id,
    delta: -required,
    reason: "redemption",
    reference_id: redemption.id,
  });

  return NextResponse.json({ success: true, redemption, new_points: newPoints });
}
