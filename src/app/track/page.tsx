"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Search, Phone, MapPin, Package, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
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

const STEPS = ["pending", "accepted", "picked_up", "delivered"];

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

function TrackContent() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [orderNum, setOrderNum] = useState(searchParams.get("order") || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    pending: t("status_pending"),
    accepted: t("status_accepted"),
    picked_up: t("status_picked_up"),
    delivered: t("status_delivered"),
    cancelled: t("status_cancelled"),
  };

  async function fetchOrder(num?: string) {
    const n = num || orderNum;
    if (!n.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?order_number=${encodeURIComponent(n.trim())}`);
      const data = await res.json();
      const o = data.orders?.[0];
      if (!o) throw new Error(t("orderNotFound"));
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

  useEffect(() => {
    if (!order || ["delivered","cancelled"].includes(order.status)) return;
    const interval = (order.rider_lat || order.status === "accepted") ? 5000 : 15000;
    const timer = setInterval(() => fetchOrder(order.order_number), interval);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.rider_lat]);

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
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">{t("trackTitle")}</h1>
        <p className="text-slate-500 text-sm">{t("enterOrderNumber")}</p>
      </div>

      {/* Search */}
      <div className="card mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={orderNum}
              onChange={(e) => setOrderNum(e.target.value.toUpperCase())}
              placeholder="TW-XXXXXX-XXXX"
              className="input !pl-10"
              dir="ltr"
            />
          </div>
          <button
            onClick={() => fetchOrder()}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : t("search")}
          </button>
        </div>
      </div>

      {error && <div className="card border-red-200 text-red-600 text-sm mb-4">{error}</div>}

      {order && (
        <div className="space-y-4">
          {/* Status badge */}
          <div className="card border-indigo-200 bg-indigo-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                order.status === "delivered" ? "bg-emerald-100" : order.status === "cancelled" ? "bg-red-100" : "bg-indigo-100"
              }`}>
                {order.status === "delivered" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : order.status === "cancelled" ? (
                  <Package className="w-6 h-6 text-red-500" />
                ) : (
                  <Package className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-lg">{STATUS_LABELS[order.status]}</div>
                <div className="text-xs text-slate-500" dir="ltr">{order.order_number}</div>
              </div>
              <span className={`badge badge-${order.status}`}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>
          </div>

          {/* Live map */}
          {order.customer_lat && order.customer_lng && order.status !== "delivered" && (
            <div className="card !p-0 overflow-hidden">
              <MapView
                customerLat={order.customer_lat}
                customerLng={order.customer_lng}
                riderLat={order.rider_lat}
                riderLng={order.rider_lng}
              />
              {!order.rider_lat && (
                <div className="p-3 text-center text-xs text-slate-500">
                  {t("waitingForRiderLocation")}
                </div>
              )}
            </div>
          )}

          {/* Vertical timeline */}
          <div className="card">
            <div className="space-y-0">
              {STEPS.map((s, i) => {
                const isTerminal = ["delivered", "cancelled"].includes(order.status);
                const isCompleted = i < currentStep || (isTerminal && i === currentStep);
                const isCurrent = !isTerminal && i === currentStep;
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCompleted
                          ? "bg-emerald-50 border-emerald-400 text-emerald-600"
                          : isCurrent
                          ? "bg-indigo-100 border-indigo-600 text-indigo-600 pulse-dot"
                          : "bg-slate-100 border-slate-200 text-slate-400"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`w-0.5 h-8 ${
                          isCompleted ? "bg-emerald-300" : "bg-slate-200"
                        }`} />
                      )}
                    </div>
                    <div className={`pt-1.5 text-sm font-medium ${
                      isCompleted ? "text-emerald-600" : isCurrent ? "text-slate-900" : "text-slate-400"
                    }`}>
                      {STATUS_LABELS[s]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order info */}
          <div className="card space-y-3">
            <div className="font-bold text-slate-900 mb-2">{t("orderDetails")}</div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("store")}</span>
              <span className="font-medium text-slate-900">{order.store_name}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 mb-1">{t("whatYouOrdered")}</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{order.items_description}</div>
            </div>
            {order.distance_km && (
              <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                <span className="text-slate-500">{t("distance")}</span>
                <span className="font-medium text-slate-900">{order.distance_km} {t("km")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500">{t("deliveryFee")}</span>
              <span className="font-bold text-indigo-600">{formatFee(order.delivery_fee)}</span>
            </div>
          </div>

          {/* Rider info */}
          {order.rider_name && (
            <div className="card border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{t("rider")}</div>
                  <div className="text-sm text-slate-600">{order.rider_name}</div>
                </div>
                {order.rider_phone && (
                  <a
                    href={`tel:${order.rider_phone}`}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors no-underline"
                  >
                    <Phone className="w-4 h-4" />
                    {t("callRider")}
                  </a>
                )}
              </div>
            </div>
          )}
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
