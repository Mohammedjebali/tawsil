import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = req.nextUrl;
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const owner_id = url.searchParams.get("owner_id");

    let query = supabase.from("stores").select("*");

    if (owner_id) {
      query = query.eq("owner_id", owner_id);
    } else {
      // Public listing: only approved + active
      query = query.eq("is_approved", true).eq("is_active", true);
    }

    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("name", `%${search}%`);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ stores: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const {
      owner_id, name, description, category, phone,
      address, lat, lng, opening_time, closing_time, delivery_fee,
    } = body;

    if (!owner_id || !name) {
      return NextResponse.json({ error: "owner_id and name are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("stores")
      .insert({
        owner_id,
        name,
        description: description || null,
        category: category || "restaurant",
        phone: phone || null,
        address: address || null,
        lat: lat || null,
        lng: lng || null,
        opening_time: opening_time || null,
        closing_time: closing_time || null,
        delivery_fee: delivery_fee ?? 1500,
        is_approved: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ store: data }, { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
