import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { calculateDeliveryFee, getDistanceKm } from "@/lib/fees";

const TOWN_CENTER = { lat: 36.5333, lng: 10.5167 };

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const {
      customer_name, customer_phone, customer_address,
      customer_lat, customer_lng,
      store_id, store_name, store_address,
      store_lat, store_lng,
      items_description, estimated_amount,
    } = body;

    if (!customer_name || !customer_phone || !customer_address || !store_name || !items_description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cLat = customer_lat || TOWN_CENTER.lat;
    const cLng = customer_lng || TOWN_CENTER.lng;
    const sLat = store_lat || TOWN_CENTER.lat;
    const sLng = store_lng || TOWN_CENTER.lng;

    const distance_km = getDistanceKm(sLat, sLng, cLat, cLng);
    const delivery_fee = calculateDeliveryFee(distance_km);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_name, customer_phone, customer_address,
        customer_lat: cLat, customer_lng: cLng,
        store_id: store_id || null, store_name, store_address,
        store_lat: sLat, store_lng: sLng,
        items_description,
        estimated_amount: estimated_amount || null,
        distance_km: Math.round(distance_km * 100) / 100,
        delivery_fee,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const order_number = searchParams.get("order_number");
    const status = searchParams.get("status");

    let query = supabase.from("orders").select("*");

    if (order_number) {
      query = query.eq("order_number", order_number);
    } else if (status === "pending") {
      query = query.eq("status", "pending").order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false }).limit(50);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
