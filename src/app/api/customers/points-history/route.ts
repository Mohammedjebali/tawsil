import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureApiError } from "@/lib/sentry";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");

  if (!customerId) {
    captureApiError("customer_id required", 400, { route: "/api/customers/points-history" });
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("points_history")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    captureApiError(error.message, 500, { route: "/api/customers/points-history" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ history: data || [] });
}
