"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  pending:   { label: "في الانتظار",     icon: "⏳", color: "bg-yellow-100 text-yellow-800" },
  accepted:  { label: "قبله الراكب",     icon: "✅", color: "bg-blue-100 text-blue-800" },
  picked_up: { label: "جاري التوصيل",    icon: "🛵", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "تم التسليم 🎉",   icon: "🎉", color: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغى",            icon: "❌", color: "bg-red-100 text-red-800" },
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

  const statusInfo = order ? STATUS_LABELS[order.status] : null;
  const currentStep = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold mb-1">🔍 تتبع طلبي</h1>
        <p className="text-gray-500 text-sm">أدخل رقم الطلب</p>
      </div>

      <div className="card mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={orderNum}
            onChange={(e) => setOrderNum(e.target.value.toUpperCase())}
            placeholder="TW-XXXXXX-XXXX"
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
            dir="ltr"
          />
          <button
            onClick={() => fetchOrder()}
            disabled={loading}
            className="bg-amber-400 text-amber-900 font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? "..." : "بحث"}
          </button>
        </div>
      </div>

      {error && <div className="card bg-red-50 border-red-200 text-red-700 text-sm mb-4">{error}</div>}

      {order && statusInfo && (
        <div className="space-y-3">
          {/* Status badge */}
          <div className={`card flex items-center gap-3 ${statusInfo.color}`}>
            <span className="text-3xl">{statusInfo.icon}</span>
            <div>
              <div className="font-bold">{statusInfo.label}</div>
              <div className="text-xs opacity-75" dir="ltr">{order.order_number}</div>
            </div>
          </div>

          {/* Progress steps */}
          <div className="card">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${i < currentStep ? "bg-green-500 text-white" :
                      i === currentStep ? "bg-amber-400 text-amber-900" :
                      "bg-gray-100 text-gray-400"}`}>
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 w-full mt-4 ${i < currentStep ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                  <div className="text-xs text-gray-500 mt-1 text-center" style={{fontSize:"10px"}}>
                    {STATUS_LABELS[s].label.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order info */}
          <div className="card text-right space-y-2">
            <div className="font-semibold text-gray-800 mb-2">تفاصيل الطلب</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">المحل</span>
              <span className="font-medium">{order.store_name}</span>
            </div>
            <div className="border-t pt-2">
              <div className="text-xs text-gray-500 mb-1">ما طلبته</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.items_description}</div>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-500">رسوم التوصيل</span>
              <span className="font-semibold text-amber-600">{formatFee(order.delivery_fee)}</span>
            </div>
          </div>

          {/* Rider info */}
          {order.rider_name && (
            <div className="card bg-blue-50 border-blue-200">
              <div className="text-sm font-semibold text-blue-800 mb-2">🛵 الراكب</div>
              <div className="flex justify-between text-sm text-blue-700">
                <span>{order.rider_name}</span>
                {order.rider_phone && (
                  <a href={`tel:${order.rider_phone}`} className="font-medium underline" dir="ltr">
                    {order.rider_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-center text-gray-400">يتحدث الصفحة كل 30 ثانية تلقائياً</p>
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
