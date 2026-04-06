import { captureError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { subscription, rider_name, rider_phone, customer_phone } = await req.json();
    const supabase = getSupabase();

    // Customer subscription: upsert by customer_phone to avoid duplicates
    if (customer_phone) {
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          { subscription, customer_phone },
          { onConflict: "customer_phone" }
        );
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
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
