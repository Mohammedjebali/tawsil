import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { first_name, last_name, email, phone, user_id } = await req.json();

    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert by email — if email exists, update phone/name/user_id
    const row: Record<string, string> = { first_name, last_name, email, phone };
    if (user_id) row.user_id = user_id;

    const { data, error } = await supabase
      .from("customers")
      .upsert(row, { onConflict: "email" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // unique constraint — email already exists, just return it
        const { data: existing } = await supabase
          .from("customers")
          .select()
          .eq("email", email)
          .single();
        return NextResponse.json({ customer: existing });
      }
      throw error;
    }

    return NextResponse.json({ customer: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (email) {
      const { data, error } = await supabase
        .from("customers")
        .select()
        .eq("email", email)
        .single();
      if (error) return NextResponse.json({ customer: null });
      return NextResponse.json({ customer: data });
    }

    const { data, error } = await supabase
      .from("customers")
      .select()
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ customers: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { email, first_name, last_name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const update: Record<string, string> = {};
    if (first_name !== undefined) update.first_name = first_name;
    if (last_name !== undefined) update.last_name = last_name;

    const { data, error } = await supabase
      .from("customers")
      .update(update)
      .eq("email", email)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ customer: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
