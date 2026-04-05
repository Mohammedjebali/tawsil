import { captureError, captureApiError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

const STATUS_TIMESTAMPS: Record<string, string> = {
  accepted: "accepted_at",
  picked_up: "picked_up_at",
  delivered: "delivered_at",
};

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

    // Check if rider is blocked
    if (body.status === "accepted" && body.rider_phone) {
      const { data: riderData } = await supabase
        .from("riders")
        .select("is_blocked")
        .eq("phone", body.rider_phone)
        .maybeSingle();
      if (riderData?.is_blocked) {
        captureApiError("account_blocked", 403);
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
        .in("status", ["accepted", "picked_up"]);
      if (activeOrders && activeOrders.length > 0) {
        captureApiError("rider_busy", 409);
        return NextResponse.json({ error: "rider_busy", message: "You already have an active order. Deliver it first before accepting a new one." }, { status: 409 });
      }
    }

    // Atomic "first click wins" lock for accept
    // If status is being set to 'accepted', only update if current status is still 'pending'
    let query = supabase.from("orders").update(update).eq("id", id);
    if (body.status === "accepted") {
      query = query.eq("status", "pending");
    }

    const { data, error } = await query.select().single();

    if (error) {
      captureApiError(error.message, 500);
      return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
    }

    // If accept but no data returned — someone else was faster
    if (!data && body.status === "accepted") {
      captureApiError("order_taken", 409);
      return NextResponse.json({ error: "order_taken", message: "Too late — another rider accepted this order first" }, { status: 409 });
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
