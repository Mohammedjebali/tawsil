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
      .select("*");

    if (store_id) query = query.eq("store_id", store_id);
    if (status) query = query.eq("status", status);
    query = query.limit(100);

    const { data, error } = await query;
    if (error) throw error;

    // Manually join orders data (store_orders has no FK to orders)
    if (data && data.length > 0) {
      const orderIds = [...new Set(data.map((so: { order_id: string }) => so.order_id))];
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, customer_address, status, created_at")
        .in("id", orderIds);

      const orderMap = new Map((ordersData || []).map((o: { id: string }) => [o.id, o]));
      for (const so of data) {
        (so as Record<string, unknown>).orders = orderMap.get(so.order_id) || null;
      }
    }

    return NextResponse.json({ store_orders: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
          .eq("store_owner_id", storeData.owner_id);

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const { error: updateError } = await supabase
      .from("store_orders")
      .update(updates)
      .eq("id", id);

    if (updateError) throw updateError;

    const { data, error } = await supabase
      .from("store_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    // Manually join order data (store_orders has no FK to orders)
    if (data?.order_id) {
      const { data: orderData } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, user_id, store_name, delivery_fee, items_description")
        .eq("id", data.order_id)
        .single();
      (data as Record<string, unknown>).orders = orderData || null;
    }

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

    // When store marks order READY → notify riders
    if (status === "ready") {
      try {
        // Also update the main order status to "pending" so riders see it
        if (data?.order_id) {
          await supabase.from("orders").update({ status: "pending" }).eq("id", data.order_id);
        }

        // Notify all riders
        const { data: subs } = await supabase.from("push_subscriptions").select("subscription");
        if (subs?.length && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          const storeName = data?.orders?.store_name || "Store";
          const deliveryFee = data?.orders?.delivery_fee || 1500;
          const payload = JSON.stringify({
            title: "🛵 طلب جديد!",
            body: `من ${storeName} — توصيل ${(deliveryFee / 1000).toFixed(3)} DT`,
            data: { order_number: data?.orders?.order_number },
          });
          await Promise.allSettled(
            subs.map((s: { subscription: string }) =>
              webpush.sendNotification(typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription, payload).catch(() => {})
            )
          );
        }
      } catch (_) {
        captureError(_);
      }
    }

    return NextResponse.json({ store_order: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
