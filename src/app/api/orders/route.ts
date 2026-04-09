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
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const {
      customer_name, customer_phone, customer_address,
      customer_lat, customer_lng,
      store_id, store_name, store_address,
      store_lat, store_lng,
      items_description, estimated_amount,
      cart_items,
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

    const cLat = Number(customer_lat) || TOWN_CENTER.lat;
    const cLng = Number(customer_lng) || TOWN_CENTER.lng;
    const sLat = Number(store_lat) || TOWN_CENTER.lat;
    const sLng = Number(store_lng) || TOWN_CENTER.lng;

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
      status: store_id ? "store_pending" : "pending",
    };
    if (user_id) orderRow.user_id = user_id;

    const { data, error } = await supabase
      .from("orders")
      .insert(orderRow)
      .select()
      .single();

    if (error) {
      // Client errors (invalid FK, bad UUID format) → 400, not 500
      if (error.code === "23503" || error.code === "22P02" || error.code === "23514") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // If this is a marketplace store order, create store_order and notify store owner
    if (store_id) {
      try {
        // Create store_order — must check .error since supabase-js does not throw on query failures
        const orderItems = Array.isArray(cart_items) ? cart_items.map((ci: { item_id?: string; name?: string; price?: number; quantity?: number }) => ({
          item_id: ci.item_id || "",
          name: ci.name || "",
          price: ci.price || 0,
          quantity: ci.quantity || 0,
        })) : [];
        const { error: storeOrderError } = await supabase.from("store_orders").insert({
          order_id: data.id,
          store_id,
          items: orderItems,
          subtotal: estimated_amount || 0,
          status: "pending",
        });

        if (storeOrderError) {
          console.error("[store_order] Insert failed:", {
            order_id: data.id,
            store_id,
            error: storeOrderError.message,
            code: storeOrderError.code,
          });
          captureError(new Error(`store_order insert failed for order ${data.id}: ${storeOrderError.message} (code: ${storeOrderError.code})`));
        }

        // Notify store owner via push
        const { data: storeData } = await supabase.from("stores").select("owner_id").eq("id", store_id).single();
        if (storeData?.owner_id) {
          const { data: subs } = await supabase.from("push_subscriptions").select("subscription").eq("store_owner_id", storeData.owner_id);
          if (subs && subs.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            const payload = JSON.stringify({
              title: "🛒 طلب جديد!",
              body: `طلب من ${data.customer_name} — ${items_description}`,
              data: { order_id: data.id, type: "store_order" },
            });
            await Promise.allSettled(subs.map((s) => {
              const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
              if (!sub.endpoint) return Promise.resolve();
              return webpush.sendNotification(sub, payload, { TTL: 300, urgency: 'high' });
            }));
          }
        }
      } catch (_) {
        captureError(_);
      }
    } else {
      // Regular order: notify riders directly
      try {
        const { data: subs } = await supabase.from("push_subscriptions").select("subscription").not("rider_phone", "is", null);
        if (subs && subs.length > 0 && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          const payload = JSON.stringify({
            title: "🛵 طلب جديد!",
            body: `من ${data.store_name} — توصيل ${(data.delivery_fee / 1000).toFixed(3)} DT`,
            data: { order_number: data.order_number },
          });
          await Promise.allSettled(subs.map((s) => {
            const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
            if (!sub.endpoint) return Promise.resolve();
            return webpush.sendNotification(sub, payload, { TTL: 300, urgency: 'high' });
          }));
        }
      } catch (_) {
        captureError(_);
      }
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);

    // Auto-expire orders based on granular timeouts (runs on every orders fetch)
    const now = Date.now();
    const overallCutoff = new Date(now - 30 * 60 * 1000).toISOString();     // 30 min overall
    const storePendingCutoff = new Date(now - 15 * 60 * 1000).toISOString(); // 15 min for store to confirm
    const riderPendingCutoff = new Date(now - 20 * 60 * 1000).toISOString(); // 20 min for rider to accept

    // 1. Expire store_pending orders where store hasn't confirmed within 15 minutes
    //    Only if the store_order is still "pending" (not yet confirmed)
    const { data: storePendingOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "store_pending")
      .lt("created_at", storePendingCutoff);

    if (storePendingOrders && storePendingOrders.length > 0) {
      const spIds = storePendingOrders.map((o: { id: string }) => o.id);
      // Only expire if the store_order is still pending (not confirmed/preparing)
      const { data: activeStoreOrders } = await supabase
        .from("store_orders")
        .select("order_id")
        .in("order_id", spIds)
        .in("status", ["confirmed", "preparing", "ready"]);
      const activeIds = new Set((activeStoreOrders || []).map((so: { order_id: string }) => so.order_id));
      const storeExpireIds = spIds.filter((id: string) => !activeIds.has(id));
      if (storeExpireIds.length > 0) {
        await supabase
          .from("orders")
          .update({ status: "cancelled", cancelled_by: "system", cancel_reason: "Store did not confirm within 15 minutes" })
          .in("id", storeExpireIds);
        await supabase
          .from("store_orders")
          .update({ status: "cancelled", cancelled_by: "system", cancel_reason: "Timed out" })
          .in("order_id", storeExpireIds)
          .eq("status", "pending");
      }
    }

    // 2. Expire pending orders (waiting for rider) older than 20 minutes
    const { data: riderPendingOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", riderPendingCutoff);

    if (riderPendingOrders && riderPendingOrders.length > 0) {
      const rpIds = riderPendingOrders.map((o: { id: string }) => o.id);
      await supabase
        .from("orders")
        .update({ status: "cancelled", cancelled_by: "system", cancel_reason: "No rider accepted within 20 minutes" })
        .in("id", rpIds);
    }

    // 3. Overall 30 min expiry for any remaining pending/store_pending orders
    const { data: overallExpired } = await supabase
      .from("orders")
      .select("id")
      .in("status", ["pending", "store_pending"])
      .lt("created_at", overallCutoff);

    if (overallExpired && overallExpired.length > 0) {
      const oeIds = overallExpired.map((o: { id: string }) => o.id);
      // Check for actively processing store orders
      const { data: activeStoreOrders } = await supabase
        .from("store_orders")
        .select("order_id")
        .in("order_id", oeIds)
        .in("status", ["confirmed", "preparing"]);
      const activeOrderIds = new Set((activeStoreOrders || []).map((so: { order_id: string }) => so.order_id));
      const idsToCancel = oeIds.filter((id: string) => !activeOrderIds.has(id));
      if (idsToCancel.length > 0) {
        await supabase
          .from("orders")
          .update({ status: "cancelled", cancelled_by: "system", cancel_reason: "Order expired after 30 minutes" })
          .in("id", idsToCancel);
      }
    }
    const order_number = searchParams.get("order_number");
    const status = searchParams.get("status");
    const phone = searchParams.get("phone");
    let user_id = searchParams.get("user_id");

    // Validate user_id is a UUID to prevent injection via .or()
    if (user_id && !/^[0-9a-f-]{36}$/i.test(user_id)) user_id = "";

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
      // Include orders by user_id OR matching phone (covers old orders with NULL user_id)
      if (phone) {
        query = query.or(`user_id.eq.${user_id},customer_phone.eq.${phone}`);
      } else {
        query = query.eq("user_id", user_id);
      }
      query = query.order("created_at", { ascending: false }).limit(50);
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
