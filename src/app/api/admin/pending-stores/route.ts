import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, category, address, phone, owner_id, created_at")
      .eq("is_approved", false)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ stores: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
