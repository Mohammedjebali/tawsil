import { captureError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { subscription, rider_name, rider_phone, customer_phone, store_owner_id } = await req.json();
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
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("customer_phone", customer_phone)
        .maybeSingle();

      const { error } = existing
        ? await supabase
            .from("push_subscriptions")
            .update({ subscription })
            .eq("id", existing.id)
        : await supabase
            .from("push_subscriptions")
            .insert({ subscription, customer_phone });

      if (error) {
        captureError(error, { context: "customer_push_subscribe", customer_phone });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    // Rider subscription: insert as before
    const row: Record<string, unknown> = { subscription };
    if (rider_name) row.rider_name = rider_name;
    if (rider_phone) row.rider_phone = rider_phone;
    const { error } = await supabase.from("push_subscriptions").insert(row);
    if (error) {
      captureError(error, { context: "rider_push_subscribe", rider_phone });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    captureError(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
