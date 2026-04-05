import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureApiError } from "@/lib/sentry";

// GET /api/rider-fees — list fee payments
// ?rider_phone=... &is_paid=true/false
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const riderPhone = searchParams.get("rider_phone");
  const isPaid = searchParams.get("is_paid");

  let query = supabase
    .from("rider_fee_payments")
    .select("*")
    .order("created_at", { ascending: false });

  if (riderPhone) query = query.eq("rider_phone", riderPhone);
  if (isPaid !== null) query = query.eq("is_paid", isPaid === "true");

  const { data, error } = await query;
  if (error) {
    captureApiError(error.message, 500, { route: "/api/rider-fees", method: "GET" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ fees: data });
}

// PATCH /api/rider-fees — mark fees as paid
// Body: { rider_phone: string } or { fee_ids: string[] }
export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  const { rider_phone, fee_ids } = body;

  const update = { is_paid: true, paid_at: new Date().toISOString() };

  let query = supabase.from("rider_fee_payments").update(update);

  if (fee_ids && Array.isArray(fee_ids)) {
    query = query.in("id", fee_ids);
  } else if (rider_phone) {
    query = query.eq("rider_phone", rider_phone).eq("is_paid", false);
  } else {
    captureApiError("Provide rider_phone or fee_ids", 400, { route: "/api/rider-fees", method: "PATCH" });
    return NextResponse.json({ error: "Provide rider_phone or fee_ids" }, { status: 400 });
  }

  const { data, error } = await query.select();
  if (error) {
    captureApiError(error.message, 500, { route: "/api/rider-fees", method: "PATCH" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ updated: data?.length || 0, fees: data });
}
