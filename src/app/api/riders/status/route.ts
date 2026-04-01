import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const phone = new URL(req.url).searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("riders")
      .select("status")
      .eq("phone", phone)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ status: data.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
