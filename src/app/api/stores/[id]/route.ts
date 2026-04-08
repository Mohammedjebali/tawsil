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

    const [storeRes, catsRes, itemsRes] = await Promise.all([
      supabase.from("stores").select("*").eq("id", id).single(),
      supabase
        .from("store_categories")
        .select("*")
        .eq("store_id", id)
        .order("sort_order"),
      supabase
        .from("store_items")
        .select("*")
        .eq("store_id", id)
        .eq("is_available", true)
        .order("sort_order"),
    ]);

    if (storeRes.error) throw storeRes.error;

    return NextResponse.json({
      store: storeRes.data,
      categories: catsRes.data || [],
      items: itemsRes.data || [],
    });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const body = await req.json();

    // Allow updating these fields
    const allowed = [
      "name", "description", "category", "phone", "address",
      "lat", "lng", "logo_url", "cover_url", "is_active", "is_approved",
      "rating", "opening_time", "closing_time", "delivery_fee",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from("stores")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ store: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from("stores")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
