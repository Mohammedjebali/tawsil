import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";
import webpush from "web-push";

try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@tawsil.tn",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }
} catch (_) {}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = req.nextUrl;
    const store_id = url.searchParams.get("store_id");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("store_orders")
      .select("*, orders(order_number, customer_name, customer_phone, customer_address, status, created_at)")
      .order("store_confirmed_at", { ascending: false, nullsFirst: true });

    if (store_id) query = query.eq("store_id", store_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ store_orders: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { order_id, store_id, items, subtotal } = body;

    if (!order_id || !store_id) {
      return NextResponse.json({ error: "order_id and store_id are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("store_orders")
      .insert({
        order_id,
        store_id,
        items: items || [],
        subtotal: subtotal || 0,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Notify the store owner via push
    try {
      const { data: storeData } = await supabase
        .from("stores")
        .select("owner_id")
        .eq("id", store_id)
        .single();

      if (storeData?.owner_id) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("customer_phone", storeData.owner_id);

        if (subs?.length) {
          const payload = JSON.stringify({
            title: "Tawsil - New Order!",
            body: `You have a new store order with ${(items || []).length} item(s)`,
          });
          await Promise.allSettled(
            subs.map((s: { subscription: string }) =>
              webpush.sendNotification(JSON.parse(s.subscription), payload).catch(() => {})
            )
          );
        }
      }
    } catch (_) {}

    return NextResponse.json({ store_order: data }, { status: 201 });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    const validStatuses = ["confirmed", "preparing", "ready", "picked_up"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status };
    if (status === "confirmed") updates.store_confirmed_at = new Date().toISOString();
    if (status === "ready") updates.store_ready_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("store_orders")
      .update(updates)
      .eq("id", id)
      .select("*, orders(order_number, customer_name, customer_phone, user_id)")
      .single();

    if (error) throw error;

    // Notify customer when order is confirmed
    if (status === "confirmed" && data?.orders?.customer_phone) {
      try {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("subscription")
          .eq("customer_phone", data.orders.customer_phone);

        if (subs?.length) {
          const payload = JSON.stringify({
            title: "Tawsil",
            body: `Your order ${data.orders.order_number} has been confirmed!`,
          });
          await Promise.allSettled(
            subs.map((s: { subscription: string }) =>
              webpush.sendNotification(JSON.parse(s.subscription), payload).catch(() => {})
            )
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({ store_order: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
