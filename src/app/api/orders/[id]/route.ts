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
    const { status, rider_name, rider_phone } = body;

    const update: Record<string, unknown> = { status };
    if (rider_name) update.rider_name = rider_name;
    if (rider_phone) update.rider_phone = rider_phone;
    if (STATUS_TIMESTAMPS[status]) {
      update[STATUS_TIMESTAMPS[status]] = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("orders")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ order: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
