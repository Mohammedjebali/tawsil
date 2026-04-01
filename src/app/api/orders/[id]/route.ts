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
    const allowedFields = ["status", "rider_name", "rider_phone", "rider_lat", "rider_lng"];
    const update: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (body.status && STATUS_TIMESTAMPS[body.status]) {
      update[STATUS_TIMESTAMPS[body.status]] = new Date().toISOString();
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
