import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET(req: Request) {
  // Vercel cron sends Authorization: Bearer CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();
  const expiryMinutes = 30;
  const cutoff = new Date(Date.now() - expiryMinutes * 60 * 1000).toISOString();

  const { data: expired, error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("id, order_number, customer_name, customer_phone");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[expire-orders] Cancelled ${expired?.length || 0} expired orders`);

  return NextResponse.json({
    cancelled: expired?.length || 0,
    orders: expired?.map((o: { order_number: string }) => o.order_number) || [],
  });
}
