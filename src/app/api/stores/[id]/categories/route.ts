import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("store_categories")
      .select("*")
      .eq("store_id", id)
      .order("sort_order");

    if (error) throw error;

    return NextResponse.json({ categories: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const body = await req.json();
    const { name, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("store_categories")
      .insert({
        store_id: id,
        name,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
