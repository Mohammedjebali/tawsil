import { getSupabase } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Today's orders
  const { data: todayOrders } = await supabase
    .from("orders")
    .select("id, status, store_name, order_number, created_at, delivery_fee, rider_id")
    .gte("created_at", todayISO);

  const orders = todayOrders || [];
  const delivered = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const active = orders.filter((o) =>
    ["pending", "accepted", "picked_up"].includes(o.status)
  );
  // Today's revenue
  const todayRevenue = delivered.length * 500;

  // Overall revenue (all time)
  const { data: allDelivered } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "delivered");
  const overallRevenue = (allDelivered || []).length * 500;

  // Flagged pending orders
  const { data: flaggedOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("flagged", true)
    .eq("status", "pending");
  const flaggedCount = flaggedOrders?.length || 0;

  // All orders for top stores
  const { data: allOrders } = await supabase
    .from("orders")
    .select("store_name");

  const storeCounts: Record<string, number> = {};
  (allOrders || []).forEach((o) => {
    storeCounts[o.store_name] = (storeCounts[o.store_name] || 0) + 1;
  });
  const topStores = Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Active riders
  const { data: riders } = await supabase
    .from("riders")
    .select("id, name, status, is_online");

  const activeRiders = (riders || []).filter((r) => r.status === "active");
  const busyRiderIds = orders
    .filter((o) => ["accepted", "picked_up"].includes(o.status))
    .map((o) => (o as Record<string, unknown>).rider_id)
    .filter(Boolean);
  const busyCount = activeRiders.filter((r) =>
    busyRiderIds.includes(r.id)
  ).length;

  // Recent 5 orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, order_number, store_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const onlineCount = activeRiders.filter(
    (r) => (r as Record<string, unknown>).is_online === true
  ).length;

  return NextResponse.json({
    today: {
      total: orders.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      active: active.length,
      revenue: todayRevenue,
      overallRevenue,
      flagged: flaggedCount,
    },
    riders: {
      total: activeRiders.length,
      online: onlineCount,
      busy: busyCount,
      available: activeRiders.length - busyCount,
    },
    topStores,
    recentOrders: recentOrders || [],
  });
}
