import { captureError } from "@/lib/sentry";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ stores: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err), stores: [] });
  }
}
