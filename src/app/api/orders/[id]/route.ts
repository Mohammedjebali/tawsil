import { captureError, captureApiError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { isValidTransition } from "@/lib/order-state";
import webpush from "web-push";

try {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@tawsil.tn",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
} catch (_) {}

const STATUS_TIMESTAMPS: Record<string, string> = {
  accepted: "accepted_at",
  picked_up: "picked_up_at",
  waiting_customer: "waiting_customer_at",
  delivered: "delivered_at",
};

async function sendPushToPhone(supabase: ReturnType<typeof getSupabase>, phone: string, payload: string) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  let subsResult = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("customer_phone", phone);
  if (!subsResult.data?.length) {
    subsResult = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("customer_phone", phone.replace(/\s/g, ""));
  }
  const subs = subsResult.data;
  if (subs && subs.length > 0) {
    await Promise.allSettled(subs.map((s) => {
      const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
      if (!sub.endpoint) return Promise.resolve();
      return webpush.sendNotification(sub, payload, { TTL: 300, urgency: 'high' });
    }));
  }
}

async function sendPushToStoreOwner(supabase: ReturnType<typeof getSupabase>, storeId: string, payload: string) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  const { data: storeData } = await supabase.from("stores").select("owner_id").eq("id", storeId).single();
  if (!storeData?.owner_id) return;
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription").eq("store_owner_id", storeData.owner_id);
  if (subs && subs.length > 0) {
    await Promise.allSettled(subs.map((s) => {
      const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
      if (!sub.endpoint) return Promise.resolve();
      return webpush.sendNotification(sub, payload, { TTL: 300, urgency: 'high' });
    }));
  }
}

async function sendPushToRiders(supabase: ReturnType<typeof getSupabase>, payload: string) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription").not("rider_phone", "is", null);
  if (subs && subs.length > 0) {
    await Promise.allSettled(subs.map((s) => {
      const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
      if (!sub.endpoint) return Promise.resolve();
      return webpush.sendNotification(sub, payload, { TTL: 300, urgency: 'high' });
    }));
  }
}

async function sendPushToRiderByPhone(supabase: ReturnType<typeof getSupabase>, riderPhone: string, payload: string) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  const { data: subs } = await supabase.from("push_subscriptions").select("subscription").eq("rider_phone", riderPhone);
  if (subs && subs.length > 0) {
    await Promise.allSettled(subs.map((s) => {
      const sub = typeof s.subscription === "string" ? JSON.parse(s.subscription) : s.subscription;
      if (!sub.endpoint) return Promise.resolve();
      return webpush.sendNotification(sub, payload, { TTL: 300, urgency: 'high' });
    }));
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabase();
    const { id } = await params;
    const body = await req.json();
    const allowedFields = ["status", "rider_name", "rider_phone", "rider_id", "rider_lat", "rider_lng", "actual_goods_price", "price_note"];
    const update: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (body.status && STATUS_TIMESTAMPS[body.status]) {
      update[STATUS_TIMESTAMPS[body.status]] = new Date().toISOString();
    }

    // Add cancellation fields
    if (body.status === "cancelled") {
      if (body.cancelled_by) update.cancelled_by = body.cancelled_by;
      if (body.cancel_reason) update.cancel_reason = body.cancel_reason;
    }

    // Fetch current order state for validation
    const { data: current, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate state transition if status is being changed
    if (body.status && body.status !== current.status) {
      // Admin can cancel any non-terminal order
      const isAdminCancel = body.status === "cancelled" && body.cancelled_by === "admin";
      if (!isAdminCancel && !isValidTransition(current.status, body.status)) {
        return NextResponse.json(
          { error: "invalid_transition", message: `Cannot transition from '${current.status}' to '${body.status}'` },
          { status: 400 }
        );
      }
    }

    // Check if rider is blocked
    if (body.status === "accepted" && body.rider_phone) {
      const { data: riderData } = await supabase
        .from("riders")
        .select("is_blocked")
        .eq("phone", body.rider_phone)
        .maybeSingle();
      if (riderData?.is_blocked) {
        return NextResponse.json(
          { error: "account_blocked", message: "Your account has been blocked. Contact support." },
          { status: 403 }
        );
      }
    }

    // Rider capacity check — max 1 active order at a time
    if (body.status === "accepted" && body.rider_phone) {
      const { data: activeOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("rider_phone", body.rider_phone)
        .in("status", ["accepted", "picked_up", "waiting_customer"]);
      if (activeOrders && activeOrders.length > 0) {
        return NextResponse.json({ error: "rider_busy", message: "You already have an active order. Deliver it first before accepting a new one." }, { status: 409 });
      }
    }

    // Atomic conditional update — only update if status hasn't changed since we read it
    // This prevents race conditions (e.g., two riders accepting simultaneously)
    const { data, error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", id)
      .eq("status", current.status)
      .select("*")
      .single();

    if (!data) {
      // Race condition — someone else changed the status first (expected behavior)
      return NextResponse.json(
        { error: "order_conflict", message: body.status === "accepted" ? "Too late — another rider accepted this order first" : "Order status has changed. Please refresh." },
        { status: 409 }
      );
    }

    if (error) {
      captureApiError(error.message, 500);
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }

    // Notify customer via push when rider is waiting
    if (body.status === "waiting_customer" && data?.customer_phone) {
      try {
        const payload = JSON.stringify({
          title: "🛵 السائق في انتظارك!",
          body: "Your rider is waiting for you!",
          data: { order_number: data.order_number },
        });
        await sendPushToPhone(supabase, data.customer_phone, payload);
      } catch (_) {
        captureError(_);
      }
    }

    // Push notifications on cancellation
    if (body.status === "cancelled" && data) {
      try {
        const cancelPayload = JSON.stringify({
          title: "❌ تم إلغاء الطلب",
          body: `Order ${data.order_number} has been cancelled`,
          data: { order_number: data.order_number },
        });

        const cancelledBy = body.cancelled_by || "unknown";

        if (cancelledBy === "customer") {
          // Notify store owner + rider (if assigned)
          if (data.store_id) await sendPushToStoreOwner(supabase, data.store_id, cancelPayload);
          if (data.rider_phone) await sendPushToRiderByPhone(supabase, data.rider_phone, cancelPayload);
        } else if (cancelledBy === "store_owner") {
          // Notify customer
          if (data.customer_phone) await sendPushToPhone(supabase, data.customer_phone, cancelPayload);
        } else if (cancelledBy === "rider") {
          // Notify customer + store owner
          if (data.customer_phone) await sendPushToPhone(supabase, data.customer_phone, cancelPayload);
          if (data.store_id) await sendPushToStoreOwner(supabase, data.store_id, cancelPayload);
        } else if (cancelledBy === "admin") {
          // Notify everyone
          if (data.customer_phone) await sendPushToPhone(supabase, data.customer_phone, cancelPayload);
          if (data.store_id) await sendPushToStoreOwner(supabase, data.store_id, cancelPayload);
          if (data.rider_phone) await sendPushToRiderByPhone(supabase, data.rider_phone, cancelPayload);
        }
      } catch (_) {
        captureError(_);
      }
    }

    // Award 10 loyalty points on delivery + referrer rewards
    if (body.status === "delivered" && data?.customer_phone) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id, points, referred_by")
        .eq("phone", data.customer_phone)
        .single();
      if (customer) {
        // Award 10 points to the customer
        await supabase
          .from("customers")
          .update({ points: (customer.points || 0) + 10 })
          .eq("id", customer.id);

        // Referrer rewards on first delivery
        if (customer.referred_by) {
          // Count delivered orders for this customer (including the one just delivered)
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("customer_phone", data.customer_phone)
            .eq("status", "delivered");

          if (count === 1) {
            // First delivered order — reward the referrer
            const { data: referrer } = await supabase
              .from("customers")
              .select("id, points, successful_referrals_count, referral_bonus_claimed")
              .eq("referral_code", customer.referred_by)
              .single();

            if (referrer) {
              const newCount = (referrer.successful_referrals_count || 0) + 1;
              let bonusPoints = 20;
              const updates: Record<string, unknown> = {
                points: (referrer.points || 0) + 20,
                successful_referrals_count: newCount,
              };

              // Auto-award 50 bonus at 5 referrals
              if (newCount >= 5 && !referrer.referral_bonus_claimed) {
                updates.points = (referrer.points || 0) + 20 + 50;
                updates.referral_bonus_claimed = true;
                bonusPoints = 70;
              }

              void bonusPoints;
              await supabase
                .from("customers")
                .update(updates)
                .eq("id", referrer.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ order: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
