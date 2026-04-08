"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Phone, MapPin, Package, CheckCircle2, ChevronRight, XCircle, Loader2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { useRealtimeContext } from "@/components/RealtimeProvider";
import MapView from "./MapView";

interface Order {
  id: string;
  order_number: string;
  status: string;
  store_name: string;
  store_id: string | null;
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
  waiting_customer_at: string | null;
  delivered_at: string | null;
}

const STEPS = ["store_pending", "pending", "accepted", "picked_up", "waiting_customer", "delivered"];
const STORE_STEPS = ["pending", "confirmed", "preparing", "ready", "accepted", "picked_up", "waiting_customer", "delivered"];
const ACTIVE_STATUSES = ["store_pending", "pending", "accepted", "picked_up", "waiting_customer"];

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

function TrackContent() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const [orderNum, setOrderNum] = useState(searchParams.get("order") || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load state
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [storeOrderStatus, setStoreOrderStatus] = useState<string | null>(null);
  const [cancellingTrack, setCancellingTrack] = useState(false);
  const [confirmCancelTrack, setConfirmCancelTrack] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    pending: t("status_pending"),
    store_pending: t("status_store_pending"),
    accepted: t("status_accepted"),
    picked_up: t("status_picked_up"),
    waiting_customer: t("status_waiting_customer"),
    delivered: t("status_delivered"),
    cancelled: t("status_cancelled"),
  };

  const STORE_ORDER_LABELS: Record<string, string> = {
    pending: t("status_order_received"),
    confirmed: t("status_confirmed"),
    preparing: t("status_preparing"),
    ready: t("status_waiting_rider"),
  };

  const STATUS_COLORS: Record<string, string> = {
    store_pending: "bg-purple-100 text-purple-700",
    pending: "bg-amber-100 text-amber-700",
    accepted: "bg-blue-100 text-blue-700",
    picked_up: "bg-indigo-100 text-indigo-700",
    waiting_customer: "bg-orange-100 text-orange-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
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

  // Auto-load active orders for logged-in customers
  useEffect(() => {
    // If opened with ?order=, fetch that directly
    if (searchParams.get("order")) {
      fetchOrder(searchParams.get("order")!);
      setAutoLoaded(true);
      return;
    }

    // Check localStorage for logged-in customer
    try {
      const raw = localStorage.getItem("tawsil_user");
      if (!raw) {
        setAutoLoaded(true);
        setShowSearch(true);
        return;
      }
      const user = JSON.parse(raw);
      if (user.role !== "customer" || !user.user_id) {
        setAutoLoaded(true);
        setShowSearch(true);
        return;
      }

      setAutoLoading(true);
      const params = new URLSearchParams({ user_id: user.user_id });
      if (user.phone) params.set("phone", user.phone);

      fetch(`/api/orders?${params}`)
        .then((res) => res.json())
        .then((data) => {
          const orders: Order[] = data.orders || [];
          const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
          setActiveOrders(active);

          // If exactly one active order, auto-select it
          if (active.length === 1) {
            setOrder(active[0]);
          }
          // If no active orders, show search
          if (active.length === 0) {
            setShowSearch(true);
          }
        })
        .catch(() => {
          setShowSearch(true);
        })
        .finally(() => {
          setAutoLoading(false);
          setAutoLoaded(true);
        });
    } catch {
      setAutoLoaded(true);
      setShowSearch(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch store_order status for marketplace orders (initial load)
  useEffect(() => {
    if (!order || !order.store_id || order.status !== "store_pending") {
      setStoreOrderStatus(null);
      return;
    }
    async function fetchStoreOrderStatus() {
      try {
        const res = await fetch(`/api/store-orders?store_id=${order!.store_id}`);
        const data = await res.json();
        const storeOrder = (data.store_orders || []).find(
          (so: { order_id: string }) => so.order_id === order!.id
        );
        if (storeOrder) setStoreOrderStatus(storeOrder.status);
      } catch {}
    }
    fetchStoreOrderStatus();
  }, [order?.id, order?.store_id, order?.status]);

  // Realtime: subscribe to order updates and store_order updates
  const isActive = order && !["delivered", "cancelled"].includes(order.status);

  const trackSubs = useMemo(() => {
    if (!order || !isActive) return [];
    const subs = [
      {
        table: "orders",
        event: "UPDATE" as const,
        filter: `id=eq.${order.id}`,
        callback: () => { fetchOrder(order.order_number); },
      },
    ];
    // Also subscribe to store_orders for marketplace orders
    if (order.store_id && order.status === "store_pending") {
      subs.push({
        table: "store_orders",
        event: "UPDATE" as const,
        filter: `order_id=eq.${order.id}`,
        callback: () => {
          fetch(`/api/store-orders?store_id=${order.store_id}`)
            .then((r) => r.json())
            .then((data) => {
              const so = (data.store_orders || []).find(
                (s: { order_id: string }) => s.order_id === order.id,
              );
              if (so) setStoreOrderStatus(so.status);
            })
            .catch(() => {});
        },
      });
    }
    return subs;
  }, [order?.id, order?.status, order?.store_id, isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeSubscription(trackSubs, {
    channelName: order ? `track-${order.id}` : undefined,
    enabled: !!order && !!isActive,
  });

  // Refresh on reconnect
  const { lastReconnect } = useRealtimeContext();
  useEffect(() => {
    if (lastReconnect && order) fetchOrder(order.order_number);
  }, [lastReconnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // For store orders in store_pending, use the store_order status for display
  const isStoreOrder = order?.store_id && order?.status === "store_pending" && storeOrderStatus;
  const displaySteps = isStoreOrder ? STORE_STEPS : STEPS;
  const displayStatus = isStoreOrder ? storeOrderStatus : order?.status || "";
  const displayLabel = isStoreOrder
    ? (STORE_ORDER_LABELS[storeOrderStatus] || STATUS_LABELS[storeOrderStatus] || storeOrderStatus)
    : STATUS_LABELS[order?.status || ""];
  const currentStep = order ? displaySteps.indexOf(displayStatus) : -1;

  // Loading state while auto-fetching
  if (!autoLoaded || autoLoading) {
    return (
      <div>
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{t("trackTitle")}</h1>
        </div>
        <div className="card">
          <div className="flex items-center justify-center gap-2 py-6 text-slate-500 text-sm">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            {t("loadingYourOrders")}
          </div>
        </div>
      </div>
    );
  }

  // Multiple active orders — show picker
  if (!order && activeOrders.length > 1) {
    return (
      <div>
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{t("trackTitle")}</h1>
          <p className="text-slate-500 text-sm">{t("yourActiveOrders")}</p>
        </div>

        <div className="space-y-3 mb-5">
          {activeOrders.map((o) => (
            <button
              key={o.id}
              onClick={() => setOrder(o)}
              className="card w-full text-left hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  o.status === "waiting_customer" ? "bg-amber-100" : "bg-indigo-100"
                }`}>
                  {o.status === "waiting_customer"
                    ? <MapPin className="w-5 h-5 text-amber-600" />
                    : <Package className="w-5 h-5 text-indigo-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm">{o.store_name}</div>
                  <div className="text-xs text-slate-500 truncate">{o.items_description}</div>
                  <div className="text-xs text-slate-400 mt-0.5" dir="ltr">{o.order_number}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setActiveOrders([]); setShowSearch(true); }}
          className="text-indigo-600 text-sm font-medium hover:underline w-full text-center"
        >
          {t("trackByOrderNumber")}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header — only show when no order is selected */}
      {!order && (
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{t("trackTitle")}</h1>
          {showSearch && activeOrders.length === 0 && (
            <p className="text-slate-500 text-sm">{t("noActiveOrders")}</p>
          )}
        </div>
      )}

      {/* Search — shown as fallback or when toggled */}
      {!order && showSearch && (
        <div className="card mb-5">
          <p className="text-xs text-slate-500 mb-2">{t("enterOrderNumber")}</p>
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
      )}

      {error && <div className="card border-red-200 text-red-600 text-sm mb-4">{error}</div>}

      {order && order.status === "delivered" && (
        <div className="space-y-4">
          {/* Celebration banner */}
          <div className="card border-emerald-200 bg-emerald-50">
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2
                className="w-14 h-14 text-emerald-500 mb-3"
                style={{ animation: "scale-in 0.4s ease-out" }}
              />
              <div className="text-xl font-bold text-emerald-800">{t("orderDelivered")}</div>
            </div>
          </div>

          {/* Delivery summary */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-slate-900">{t("deliverySummary")}</div>
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {STATUS_LABELS["delivered"]}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("orderNumber")}</span>
              <span className="font-medium text-slate-900" dir="ltr">{order.order_number}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500">{t("store")}</span>
              <span className="font-medium text-slate-900">{order.store_name}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 mb-1">{t("whatYouOrdered")}</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{order.items_description}</div>
            </div>
            {order.rider_name && (
              <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                <span className="text-slate-500">{t("rider")}</span>
                <span className="font-medium text-slate-900">{order.rider_name}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500">{t("deliveryFee")}</span>
              <span className="font-bold text-indigo-600">{formatFee(order.delivery_fee)}</span>
            </div>
            {order.delivered_at && order.created_at && (
              <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                <span className="text-slate-500">{t("deliveredIn")}</span>
                <span className="font-medium text-emerald-600">
                  {Math.round((new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime()) / 60000)} {t("minutes")}
                </span>
              </div>
            )}
          </div>

          {/* Step progress tracker */}
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
                          ? (s === "waiting_customer" ? "bg-amber-100 border-amber-500 text-amber-600 pulse-dot" : "bg-indigo-100 border-indigo-600 text-indigo-600 pulse-dot")
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

          {/* Order Again */}
          <Link
            href="/app"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-center px-5 py-3 rounded-xl text-sm transition-colors no-underline"
          >
            {t("orderAgain")}
          </Link>

          <style jsx>{`
            @keyframes scale-in {
              0% { transform: scale(0); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {order && order.status !== "delivered" && (
        <div className="space-y-4">
          {/* Status badge */}
          <div className={`card ${order.status === "waiting_customer" ? "border-amber-300 bg-amber-50/50" : "border-indigo-200 bg-indigo-50/50"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                order.status === "cancelled" ? "bg-red-100" : order.status === "waiting_customer" ? "bg-amber-100" : "bg-indigo-100"
              }`}>
                {order.status === "cancelled" ? (
                  <Package className="w-6 h-6 text-red-500" />
                ) : order.status === "waiting_customer" ? (
                  <MapPin className="w-6 h-6 text-amber-600" />
                ) : (
                  <Package className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-lg">{displayLabel}</div>
                <div className="text-xs text-slate-500" dir="ltr">{order.order_number}</div>
              </div>
              <span className={`badge badge-${order.status}`}>
                {displayLabel}
              </span>
            </div>
          </div>

          {/* Live map */}
          {order.customer_lat && order.customer_lng && (
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
              {displaySteps.map((s, i) => {
                const isTerminal = ["delivered", "cancelled"].includes(order.status);
                const isCompleted = i < currentStep || (isTerminal && i === currentStep);
                const isCurrent = !isTerminal && i === currentStep;
                const stepLabel = (isStoreOrder && STORE_ORDER_LABELS[s]) ? STORE_ORDER_LABELS[s] : STATUS_LABELS[s] || s;
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCompleted
                          ? "bg-emerald-50 border-emerald-400 text-emerald-600"
                          : isCurrent
                          ? (s === "waiting_customer" ? "bg-amber-100 border-amber-500 text-amber-600 pulse-dot" : "bg-indigo-100 border-indigo-600 text-indigo-600 pulse-dot")
                          : "bg-slate-100 border-slate-200 text-slate-400"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < displaySteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${
                          isCompleted ? "bg-emerald-300" : "bg-slate-200"
                        }`} />
                      )}
                    </div>
                    <div className={`pt-1.5 text-sm font-medium ${
                      isCompleted ? "text-emerald-600" : isCurrent ? "text-slate-900" : "text-slate-400"
                    }`}>
                      {stepLabel}
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

          {/* Cancel button — only for pending or store_pending */}
          {order && ["pending", "store_pending"].includes(order.status) && (
            <div className="card border-red-200">
              {confirmCancelTrack ? (
                <div>
                  <p className="text-sm text-slate-700 mb-3">{t("cancelConfirm")}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmCancelTrack(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600"
                    >
                      {t("back")}
                    </button>
                    <button
                      onClick={async () => {
                        setCancellingTrack(true);
                        try {
                          await fetch(`/api/orders/${order.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "cancelled", cancelled_by: "customer" }),
                          });
                          setOrder({ ...order, status: "cancelled" });
                        } finally {
                          setCancellingTrack(false);
                          setConfirmCancelTrack(false);
                        }
                      }}
                      disabled={cancellingTrack}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white flex items-center justify-center gap-1.5"
                    >
                      {cancellingTrack ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      {t("cancelOrder")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCancelTrack(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {t("cancelOrder")}
                </button>
              )}
            </div>
          )}

          {/* Track by order number link at bottom */}
          {!showSearch && (
            <button
              onClick={() => { setOrder(null); setActiveOrders([]); setShowSearch(true); }}
              className="text-indigo-600 text-sm font-medium hover:underline w-full text-center"
            >
              {t("trackByOrderNumber")}
            </button>
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
