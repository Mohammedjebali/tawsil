"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Package, MapPin, Clock } from "lucide-react";
import { useLang } from "@/components/LangProvider";

interface RiderStats {
  totalDelivered: number;
  todayDelivered: number;
  totalEarnings: number;
  todayEarnings: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  store_name: string;
  items_description: string;
  delivery_fee: number;
  created_at: string;
}

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

export default function RiderStatsPage() {
  const { t } = useLang();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (!saved) { window.location.href = "/rider"; return; }
    const user = JSON.parse(saved);
    if (user.role !== "rider") { window.location.href = "/rider"; return; }

    // Get db_id from status endpoint
    fetch(`/api/riders/status?phone=${encodeURIComponent(user.phone)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.id) { window.location.href = "/rider"; return; }
        setRiderId(data.id);
      })
      .catch(() => { window.location.href = "/rider"; });
  }, []);

  // Fetch stats
  useEffect(() => {
    if (!riderId) return;
    function fetchStats() {
      fetch(`/api/riders/stats?id=${riderId}`)
        .then(r => r.json())
        .then(data => { if (data.totalDelivered !== undefined) setStats(data); })
        .catch(() => {});
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [riderId]);

  // Fetch today's history
  useEffect(() => {
    if (!riderId) return;
    setHistoryLoading(true);
    fetch(`/api/orders?rider_id=${riderId}&status=delivered`)
      .then(r => r.json())
      .then(data => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = (data.orders || []).filter((o: Order) => new Date(o.created_at) >= today);
        setHistoryOrders(todayOrders);
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [riderId]);

  return (
    <div>
      {/* My Stats */}
      {stats && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-3">
            <TrendingUp className="w-4 h-4" />
            {t("myStats")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-2.5 border border-blue-100 text-center">
              <div className="text-lg font-bold text-slate-900">{stats.totalDelivered}</div>
              <div className="text-xs text-slate-500">{t("totalDelivered")}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-blue-100 text-center">
              <div className="text-lg font-bold text-slate-900">{stats.todayDelivered}</div>
              <div className="text-xs text-slate-500">{t("todayDelivered")}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-blue-100 text-center">
              <div className="text-lg font-bold text-emerald-700">{formatFee(stats.totalEarnings)}</div>
              <div className="text-xs text-slate-500">{t("totalEarnings")}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-blue-100 text-center">
              <div className="text-lg font-bold text-emerald-700">{formatFee(stats.todayEarnings)}</div>
              <div className="text-xs text-slate-500">{t("todayEarnings")}</div>
            </div>
          </div>
        </div>
      )}

      {/* Today's delivery history */}
      <h2 className="text-sm font-bold text-slate-700 mb-3">{t("history")}</h2>
      <div className="space-y-3">
        {historyLoading && <div className="text-center text-slate-500 py-8">{t("loading")}</div>}
        {!historyLoading && historyOrders.length === 0 && (
          <div className="card text-center text-slate-500 py-8">{t("noDeliveriesToday")}</div>
        )}
        {historyOrders.map((order) => (
          <div key={order.id} className="card">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-mono" dir="ltr">{order.order_number}</span>
              <span className="text-xs text-slate-400">
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
              <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-semibold">{order.store_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{order.customer_address}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">{t("earnedPerOrder")}</span>
              <span className="text-sm font-bold text-emerald-700">1.500 DT</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
