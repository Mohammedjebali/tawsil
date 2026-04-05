import { getSupabase } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { captureApiError } from "@/lib/sentry";

export async function GET() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return NextResponse.json({ announcement: data || null });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const body = await req.json();
  await supabase.from("announcements").update({ is_active: false }).eq("is_active", true);
  const { data, error } = await supabase.from("announcements").insert(body).select().single();
  if (error) {
    captureApiError(error.message, 500, { route: "/api/announcements", method: "POST" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ announcement: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  const { id, is_active } = await req.json();
  await supabase.from("announcements").update({ is_active }).eq("id", id);
  return NextResponse.json({ success: true });
}
