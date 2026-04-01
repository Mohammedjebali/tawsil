import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { name, phone } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: "Missing name or phone" }, { status: 400 });
    }

    // Check if rider already exists
    const { data: existing } = await supabase
      .from("riders")
      .select("*")
      .eq("phone", phone)
      .single();

    if (existing) {
      return NextResponse.json({ rider: existing });
    }

    const { data, error } = await supabase
      .from("riders")
      .insert({ name, phone, status: "pending" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ rider: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
