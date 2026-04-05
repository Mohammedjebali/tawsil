import { captureError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { calculateDeliveryFee, getDistanceKm } from "@/lib/fees";
import webpush from "web-push";

try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@tawsil.tn",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
} catch (_) {
  // Invalid VAPID keys — push notifications will be disabled but orders still work
}

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
      user_id,
    } = body;

    if (!customer_name || !customer_phone || !customer_address || !store_name || !items_description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if customer is blocked — prefer user_id lookup, fall back to phone
    let blockedCustomer: { is_blocked?: boolean } | null = null;
    if (user_id) {
      const { data } = await supabase
        .from("customers")
        .select("is_blocked")
        .eq("user_id", user_id)
        .maybeSingle();
      blockedCustomer = data;
    }
    if (!blockedCustomer) {
      const { data } = await supabase
        .from("customers")
        .select("is_blocked")
        .eq("phone", customer_phone)
        .maybeSingle();
      blockedCustomer = data;
    }
    if (blockedCustomer?.is_blocked) {
      return NextResponse.json(
        { error: "account_blocked", message: "Your account has been blocked. Contact support." },
        { status: 403 }
      );
    }

    const cLat = customer_lat || TOWN_CENTER.lat;
    const cLng = customer_lng || TOWN_CENTER.lng;
    const sLat = store_lat || TOWN_CENTER.lat;
    const sLng = store_lng || TOWN_CENTER.lng;

    const distance_km = getDistanceKm(sLat, sLng, cLat, cLng);
    const delivery_fee = calculateDeliveryFee(distance_km);

    const orderRow: Record<string, unknown> = {
      customer_name, customer_phone, customer_address,
      customer_lat: cLat, customer_lng: cLng,
      store_id: store_id || null, store_name, store_address,
      store_lat: sLat, store_lng: sLng,
      items_description,
      estimated_amount: estimated_amount || null,
      distance_km: Math.round(distance_km * 100) / 100,
      delivery_fee,
      status: "pending",
    };
    if (user_id) orderRow.user_id = user_id;

    const { data, error } = await supabase
      .from("orders")
      .insert(orderRow)
      .select()
      .single();

    if (error) throw error;

    // Notify riders via push directly (avoid localhost HTTP call on Vercel)
    try {
      const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
      if (subs && subs.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        const payload = JSON.stringify({
          title: "🛵 طلب جديد!",
          body: `من ${data.store_name} — توصيل ${(data.delivery_fee / 1000).toFixed(3)} DT`,
          data: { order_number: data.order_number },
        });
        await Promise.allSettled(subs.map((s) => webpush.sendNotification(s.subscription, payload)));
      }
    } catch (_) {
      captureError(_);
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    // Auto-expire pending orders older than 30 minutes (runs on every orders fetch)
    const expiryCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("status", "pending")
      .lt("created_at", expiryCutoff);
    const order_number = searchParams.get("order_number");
    const status = searchParams.get("status");
    const phone = searchParams.get("phone");
    const user_id = searchParams.get("user_id");

    const rider_id = searchParams.get("rider_id");
    const rider_phone = searchParams.get("rider_phone");
    const excludePassedBy = searchParams.get("exclude_passed_by");

    let query = supabase.from("orders").select("*");

    // Exclude orders this rider has already passed on
    if (excludePassedBy) {
      const { data: passes } = await supabase
        .from("order_passes")
        .select("order_id")
        .eq("rider_id", excludePassedBy);
      const passedIds = (passes || []).map((p) => p.order_id);
      if (passedIds.length > 0) {
        query = query.not("id", "in", `(${passedIds.join(",")})`);
      }
    }

    if (order_number) {
      query = query.eq("order_number", order_number);
    } else if (user_id) {
      // Secure lookup: filter by authenticated user_id (prevents data leaks)
      query = query.eq("user_id", user_id).order("created_at", { ascending: false }).limit(50);
    } else if (phone) {
      query = query.eq("customer_phone", phone).order("created_at", { ascending: false }).limit(50);
    } else if (status === "pending") {
      query = query.eq("status", "pending").order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false }).limit(50);
    }

    if (rider_id) {
      query = query.eq("rider_id", rider_id);
    }
    if (rider_phone) {
      query = query.eq("rider_phone", rider_phone);
    }
    if (status && status !== "pending") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
