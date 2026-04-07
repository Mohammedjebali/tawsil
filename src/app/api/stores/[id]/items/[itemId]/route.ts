import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = getSupabase();
    const body = await req.json();

    const allowed = ["name", "description", "price", "category_id", "image_url", "is_available", "sort_order"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from("store_items")
      .update(updates)
      .eq("id", itemId)
      .eq("store_id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from("store_items")
      .update({ is_available: false })
      .eq("id", itemId)
      .eq("store_id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
