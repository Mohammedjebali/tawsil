"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Package, MapPin, Clock, CheckCircle2 } from "lucide-react";
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

interface FeePayment {
  id: string;
  order_id: string;
  order_number: string;
  store_name: string;
  fee_amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

export default function RiderStatsPage() {
  const { t } = useLang();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [riderPhone, setRiderPhone] = useState<string | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [riderTab, setRiderTab] = useState<"stats" | "fees">("stats");

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (!saved) { window.location.href = "/rider"; return; }
    const user = JSON.parse(saved);
    if (user.role !== "rider") { window.location.href = "/rider"; return; }
    setRiderPhone(user.phone);

    fetch(`/api/riders/status?phone=${encodeURIComponent(user.phone)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.id) { window.location.href = "/rider"; return; }
        setRiderId(data.id);
      })
      .catch(() => { window.location.href = "/rider"; });
  }, []);

  useEffect(() => {
    if (!riderPhone) return;
    function fetchStats() {
      fetch(`/api/riders/stats?phone=${encodeURIComponent(riderPhone!)}`)
        .then(r => r.json())
        .then(data => { if (data.totalDelivered !== undefined) setStats(data); })
        .catch(() => {});
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [riderId]);

  useEffect(() => {
    if (!riderPhone) return;
    setHistoryLoading(true);
    fetch(`/api/orders?rider_phone=${encodeURIComponent(riderPhone)}&status=delivered`)
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

  // Fetch fee payments
  useEffect(() => {
    if (!riderPhone) return;
    fetch(`/api/rider-fees?rider_phone=${encodeURIComponent(riderPhone)}`)
      .then(r => r.json())
      .then(data => { if (data.fees) setFeePayments(data.fees); })
      .catch(() => {});
  }, [riderPhone]);

  const totalFeesPaid = feePayments.filter(f => f.is_paid).reduce((s, f) => s + f.fee_amount, 0);
  const totalFeesOwed = feePayments.filter(f => !f.is_paid).reduce((s, f) => s + f.fee_amount, 0);

  return (
    <div>
      {/* Tab switcher: Stats / Fees */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setRiderTab("stats")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            riderTab === "stats" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />
          {t("myStats")}
        </button>
        <button
          onClick={() => setRiderTab("fees")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            riderTab === "fees" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
          }`}
        >
          <Package className="w-4 h-4 inline mr-1" />
          Fee Payments
        </button>
      </div>

      {/* Stats tab */}
      {riderTab === "stats" && <>
      {/* My Stats */}
      {stats && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-3">
            <TrendingUp className="w-4 h-4" />
            {t("myStats")}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-lg p-2.5 border border-indigo-100 text-center">
              <div className="text-lg font-bold text-slate-900">{stats.totalDelivered}</div>
              <div className="text-xs text-slate-500">{t("totalDelivered")}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-indigo-100 text-center">
              <div className="text-lg font-bold text-slate-900">{stats.todayDelivered}</div>
              <div className="text-xs text-slate-500">{t("todayDelivered")}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-emerald-100 text-center">
              <div className="text-lg font-bold text-emerald-700">{formatFee(stats.totalEarnings)}</div>
              <div className="text-xs text-slate-500">{t("totalEarnings")}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-emerald-100 text-center">
              <div className="text-lg font-bold text-emerald-700">{formatFee(stats.todayEarnings)}</div>
              <div className="text-xs text-slate-500">{t("todayEarnings")}</div>
            </div>
          </div>
          {/* Fee breakdown */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs text-slate-500">
            <div className="flex justify-between mb-1">
              <span>Per delivery you earn</span>
              <span className="font-semibold text-emerald-600">1.000 DT</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Service fee (paid weekly)</span>
              <span className="font-semibold text-amber-600">0.500 DT</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-1">
              <span>Customer pays</span>
              <span className="font-semibold text-indigo-600">1.500 DT</span>
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
              <span className="text-sm font-bold text-emerald-700">1.000 DT</span>
            </div>
          </div>
        ))}
      </div>

      </>
      }

      {/* Fees tab */}
      {riderTab === "fees" && <>
      {feePayments.length > 0 ? (
        <div className="card mb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-3">
            Fee Payments
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100 text-center">
              <div className="text-lg font-bold text-emerald-700">{formatFee(totalFeesPaid)}</div>
              <div className="text-xs text-slate-500">Paid</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100 text-center">
              <div className="text-lg font-bold text-amber-700">{formatFee(totalFeesOwed)}</div>
              <div className="text-xs text-slate-500">Outstanding</div>
            </div>
          </div>
          <div className="space-y-2">
            {feePayments.map(fee => (
              <div key={fee.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border ${fee.is_paid ? 'border-slate-100 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
                <div>
                  <div className="text-sm font-semibold text-slate-700">{fee.store_name || "—"}</div>
                  <div className="text-xs text-slate-400 font-mono">{fee.order_number} · {new Date(fee.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{formatFee(fee.fee_amount)}</span>
                  {fee.is_paid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-amber-400 inline-block" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center text-slate-400 py-8">No fee payments yet</div>
      )}
      </>}
    </div>
  );
}
