import { getSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  return NextResponse.json({ announcements: data || [] });
}
