"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import MapView from "./MapView";

interface Order {
  id: string;
  order_number: string;
  status: string;
  store_name: string;
  items_description: string;
  delivery_fee: number;
  distance_km: number;
  rider_name: string | null;
  rider_phone: string | null;
  rider_lat: number | null;
  rider_lng: number | null;
  customer_lat: number | null;
  customer_lng: number | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  pending:   { label: "في الانتظار",   icon: "⏳" },
  accepted:  { label: "قبله الراكب",   icon: "✅" },
  picked_up: { label: "جاري التوصيل",  icon: "🛵" },
  delivered: { label: "تم التسليم 🎉", icon: "🎉" },
  cancelled: { label: "ملغى",          icon: "❌" },
};

const STEPS = ["pending", "accepted", "picked_up", "delivered"];

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

function TrackContent() {
  const searchParams = useSearchParams();
  const [orderNum, setOrderNum] = useState(searchParams.get("order") || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrder(num?: string) {
    const n = num || orderNum;
    if (!n.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?order_number=${encodeURIComponent(n.trim())}`);
      const data = await res.json();
      const o = data.orders?.[0];
      if (!o) throw new Error("الطلب غير موجود");
      setOrder(o);
    } catch (e) {
      setError(String(e));
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("order")) fetchOrder(searchParams.get("order")!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 30s if order is active
  useEffect(() => {
    if (!order || ["delivered","cancelled"].includes(order.status)) return;
    const t = setInterval(() => fetchOrder(order.order_number), 30000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Supabase Realtime subscription for live GPS updates
  useEffect(() => {
    if (!order) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel("order-tracking")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${order.id}`,
      }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...payload.new as Partial<Order> } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const currentStep = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">تتبع طلبي</h1>
        <p className="text-gray-500 text-sm">أدخل رقم الطلب</p>
      </div>

      <div className="card mb-5">
        <div className="flex gap-2">
          <input
            type="text"
            value={orderNum}
            onChange={(e) => setOrderNum(e.target.value.toUpperCase())}
            placeholder="TW-XXXXXX-XXXX"
            className="input flex-1 !text-left"
            dir="ltr"
          />
          <button
            onClick={() => fetchOrder()}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "بحث"}
          </button>
        </div>
      </div>

      {error && <div className="card border-red-500/30 text-red-400 text-sm mb-4">{error}</div>}

      {order && (
        <div className="space-y-4">
          {/* Status badge */}
          <div className="card-active flex items-center gap-3">
            <span className="text-3xl">{STATUS_LABELS[order.status]?.icon}</span>
            <div>
              <div className="font-bold text-white text-lg">{STATUS_LABELS[order.status]?.label}</div>
              <div className="text-xs text-gray-500" dir="ltr">{order.order_number}</div>
            </div>
            <div className="mr-auto">
              <span className={`badge badge-${order.status}`}>
                {STATUS_LABELS[order.status]?.label.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Live map */}
          {order.customer_lat && order.customer_lng && order.status !== "delivered" && (
            <div className="card mb-0 p-0 overflow-hidden">
              <MapView
                customerLat={order.customer_lat}
                customerLng={order.customer_lng}
                riderLat={order.rider_lat}
                riderLng={order.rider_lng}
              />
              {!order.rider_lat && (
                <div className="p-3 text-center text-xs text-gray-500">
                  في انتظار تفعيل موقع السائق...
                </div>
              )}
            </div>
          )}

          {/* Vertical timeline */}
          <div className="card">
            <div className="space-y-0">
              {STEPS.map((s, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isFuture = i > currentStep;
                return (
                  <div key={s} className="flex items-start gap-3">
                    {/* Line + circle */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCompleted
                          ? "bg-green-500/20 border-green-500 text-green-400"
                          : isCurrent
                          ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                          : "bg-[#1e2535] border-[#2a3347] text-gray-600"
                      }`}>
                        {isCompleted ? "✓" : i + 1}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`w-0.5 h-8 ${
                          isCompleted ? "bg-green-500/40" : isFuture ? "bg-[#1e2535]" : "bg-red-500/30"
                        }`} />
                      )}
                    </div>
                    {/* Label */}
                    <div className={`pt-1.5 text-sm font-medium ${
                      isCompleted ? "text-green-400" : isCurrent ? "text-white" : "text-gray-600"
                    }`}>
                      {STATUS_LABELS[s]?.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order info */}
          <div className="card text-right space-y-3">
            <div className="font-bold text-white mb-2">تفاصيل الطلب</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المحل</span>
              <span className="font-medium text-white">{order.store_name}</span>
            </div>
            <div className="border-t border-[#1e2535] pt-3">
              <div className="text-xs text-gray-500 mb-1">ما طلبته</div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap">{order.items_description}</div>
            </div>
            <div className="flex justify-between text-sm border-t border-[#1e2535] pt-3">
              <span className="text-gray-500">رسوم التوصيل</span>
              <span className="font-bold text-red-400">{formatFee(order.delivery_fee)}</span>
            </div>
          </div>

          {/* Rider info */}
          {order.rider_name && (
            <div className="card border-blue-500/30">
              <div className="text-sm font-bold text-blue-400 mb-2">🛵 الراكب</div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{order.rider_name}</span>
                {order.rider_phone && (
                  <a href={`tel:${order.rider_phone}`} className="font-medium text-blue-400 underline" dir="ltr">
                    {order.rider_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-center text-gray-600">يتحدث الصفحة كل 30 ثانية تلقائياً</p>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackContent />
    </Suspense>
  );
}
