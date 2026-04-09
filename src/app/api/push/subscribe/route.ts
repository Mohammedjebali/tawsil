import { captureError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    let parsed: Record<string, unknown>;
    try {
      parsed = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const subscription = parsed.subscription;
    const rider_name = parsed.rider_name != null ? String(parsed.rider_name) : undefined;
    const rider_phone = parsed.rider_phone != null ? String(parsed.rider_phone) : undefined;
    const store_owner_id = parsed.store_owner_id != null ? String(parsed.store_owner_id) : undefined;
    const rawPhone = parsed.customer_phone;
    const customer_phone = rawPhone != null ? String(rawPhone) : undefined;

    if (!subscription) {
      return NextResponse.json({ error: "subscription is required" }, { status: 400 });
    }
    const supabase = getSupabase();

    // Store owner subscription
    if (store_owner_id) {
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("store_owner_id", store_owner_id)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from("push_subscriptions").update({ subscription }).eq("id", existing.id)
        : await supabase.from("push_subscriptions").insert({ subscription, store_owner_id });

      if (error) {
        captureError(error, { context: "store_owner_push_subscribe", store_owner_id });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // Customer subscription: select-then-update/insert to avoid duplicates.
    // We cannot use .upsert() with onConflict because the unique index on
    // customer_phone is a partial index (WHERE customer_phone IS NOT NULL)
    // which PostgREST does not support for upsert.
    if (customer_phone) {
      const normalizedPhone = customer_phone.replace(/\s/g, "");
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("customer_phone", normalizedPhone)
        .maybeSingle();

      const { error } = existing
        ? await supabase
            .from("push_subscriptions")
            .update({ subscription })
            .eq("id", existing.id)
        : await supabase
            .from("push_subscriptions")
            .insert({ subscription, customer_phone: normalizedPhone });

      if (error) {
        captureError(error, { context: "customer_push_subscribe", customer_phone });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // Rider subscription: upsert by rider_phone to avoid duplicates
    if (rider_phone) {
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("rider_phone", rider_phone)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from("push_subscriptions").update({ subscription }).eq("id", existing.id)
        : await supabase.from("push_subscriptions").insert({ subscription, rider_name: rider_name || null, rider_phone });

      if (error) {
        captureError(error, { context: "rider_push_subscribe", rider_phone });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Anonymous subscription (no phone)
      const row: Record<string, unknown> = { subscription };
      if (rider_name) row.rider_name = rider_name;
      const { error } = await supabase.from("push_subscriptions").insert(row);
      if (error) {
        captureError(error, { context: "rider_push_subscribe_anon" });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    captureError(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
