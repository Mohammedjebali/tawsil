"use client";

import { useState, useEffect } from "react";
import { Package, MapPin, Clock, CheckCircle2, XCircle, Loader2, ChevronRight, AlertTriangle } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import AppShell from "@/components/AppShell";

interface Order {
  id: string;
  order_number: string;
  status: string;
  store_name: string;
  items_description: string;
  delivery_fee: number;
  customer_address: string;
  created_at: string;
  rider_name?: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  picked_up: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5" />,
  accepted: <CheckCircle2 className="w-3.5 h-3.5" />,
  picked_up: <Package className="w-3.5 h-3.5" />,
  delivered: <CheckCircle2 className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

export default function OrdersPage() {
  const { t } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (!saved) { window.location.href = "/login"; return; }
    const user = JSON.parse(saved);
    if (user.role !== "customer") { window.location.href = "/"; return; }
    fetchOrders(user.phone);
  }, []);

  async function fetchOrders(phone: string) {
    try {
      const res = await fetch(`/api/orders?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setLoading(false);
    }
  }

  async function cancelOrder(orderId: string) {
    setCancelling(orderId);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o));
    } finally {
      setCancelling(null);
      setConfirmCancel(null);
    }
  }

  function formatFee(millimes: number) {
    return (millimes / 1000).toFixed(3) + " DT";
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("fr-TN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 mb-5">{t("myOrders")}</h1>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t("noOrdersYet")}</p>
            <a href="/" className="mt-4 inline-block text-blue-700 font-semibold text-sm hover:underline">
              {t("orderNow")}
            </a>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => {
            const canCancel = order.status === "pending";
            return (
              <div key={order.id} className="card">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs text-slate-400 font-mono" dir="ltr">{order.order_number}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLOR[order.status] || STATUS_COLOR.pending}`}>
                    {STATUS_ICON[order.status]}
                    {t(`status_${order.status}` as "status_pending" | "status_accepted" | "status_picked_up" | "status_delivered" | "status_cancelled") || order.status}
                  </span>
                </div>

                {/* Store + items */}
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5">
                  <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-semibold">{order.store_name}</span>
                </div>
                <p className="text-sm text-slate-500 mb-2 line-clamp-2 ps-6">{order.items_description}</p>

                {/* Address */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="line-clamp-1">{order.customer_address}</span>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-blue-700 font-bold text-sm">{formatFee(order.delivery_fee)}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>

                  {order.status === "picked_up" && (
                    <a
                      href={`/track?order=${order.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full"
                    >
                      {t("trackOrder")} <ChevronRight className="w-3 h-3" />
                    </a>
                  )}

                  {canCancel && (
                    confirmCancel === order.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmCancel(null)}
                          className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full"
                        >
                          {t("back")}
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          disabled={cancelling === order.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full"
                        >
                          {cancelling === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          {t("confirm")}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmCancel(order.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {t("cancelOrder")}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
