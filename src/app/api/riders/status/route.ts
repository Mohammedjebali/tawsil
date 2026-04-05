import { captureError, captureApiError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const phone = new URL(req.url).searchParams.get("phone");

    if (!phone) {
      captureApiError("Missing phone parameter", 400);
      return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("riders")
      .select("id, name, phone, status, is_online")
      .eq("phone", phone)
      .single();

    if (error || !data) {
      captureApiError("Rider not found", 404);
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
