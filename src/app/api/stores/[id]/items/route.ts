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
      .from("store_items")
      .select("*")
      .eq("store_id", id)
      .order("sort_order")
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ items: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const { name, description, price, category_id, image_url, sort_order } = body;

    if (!name || price == null) {
      return NextResponse.json({ error: "name and price are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("store_items")
      .insert({
        store_id: id,
        category_id: category_id || null,
        name,
        description: description || null,
        price,
        image_url: image_url || null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
