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
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner_id)) {
        return NextResponse.json({ stores: [] });
      }
      query = query.eq("owner_id", owner_id);
    } else {
      // Public listing: only approved + active
      query = query.eq("is_approved", true).eq("is_active", true);
    }

    if (category) query = query.eq("category", category);
    if (search) {
      const safe = search.replace(/[%_.]/g, "\\$&");
      query = query.ilike("name", `%${safe}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Add has_items flag for each store (non-critical — degrade gracefully)
    if (data && data.length > 0) {
      try {
        const storeIds = data.map((s: { id: string }) => s.id);
        const { data: itemCounts } = await supabase
          .from("store_items")
          .select("store_id")
          .in("store_id", storeIds)
          .eq("is_available", true);

        const itemMap: Record<string, number> = {};
        for (const ic of itemCounts || []) {
          itemMap[ic.store_id] = (itemMap[ic.store_id] || 0) + 1;
        }

        for (const store of data) {
          (store as Record<string, unknown>).has_items = (itemMap[store.id] || 0) > 0;
        }
      } catch {
        // store_items query failed — return stores without has_items
      }
    }

    return NextResponse.json({ stores: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
