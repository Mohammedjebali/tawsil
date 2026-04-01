"use client";

import { useState, useEffect } from "react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  store_name: string;
  store_address: string | null;
  items_description: string;
  delivery_fee: number;
  distance_km: number | null;
  created_at: string;
}

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  accepted:  { label: "📦 وصلت للمحل وأخذت الطلب", next: "picked_up" },
  picked_up: { label: "✅ سلمت للزبون", next: "delivered" },
};

export default function RiderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");
  const [registered, setRegistered] = useState(false);
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    const saved = localStorage.getItem("rider");
    if (saved) {
      const r = JSON.parse(saved);
      setRiderName(r.name);
      setRiderPhone(r.phone);
      setRegistered(true);
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotifStatus("granted");
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchOrders() {
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch("/api/orders?status=pending"),
        fetch("/api/orders"),
      ]);
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      setOrders(pendingData.orders || []);
      // My orders = accepted or picked_up
      const saved = localStorage.getItem("rider");
      if (saved) {
        const r = JSON.parse(saved);
        setMyOrders((allData.orders || []).filter((o: Order) =>
          ["accepted","picked_up"].includes(o.status) &&
          o.customer_phone // basic filter — in real app would use rider ID
        ));
      }
    } finally {
      setLoading(false);
    }
  }

  function register() {
    if (!riderName || !riderPhone) return;
    localStorage.setItem("rider", JSON.stringify({ name: riderName, phone: riderPhone }));
    setRegistered(true);
  }

  async function acceptOrder(orderId: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted", rider_name: riderName, rider_phone: riderPhone }),
    });
    fetchOrders();
  }

  async function subscribePush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNotifStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), rider_name: riderName, rider_phone: riderPhone }),
      });
      setNotifStatus("granted");
    } catch {
      setNotifStatus("denied");
    }
  }

  async function updateStatus(orderId: string, nextStatus: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchOrders();
  }

  if (!registered) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-5">🛵 لوحة الراكب</h1>
        <div className="card space-y-4">
          <p className="text-sm text-gray-600">أدخل معلوماتك لتبدأ استقبال الطلبات</p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">اسمك</label>
            <input type="text" value={riderName} onChange={(e) => setRiderName(e.target.value)}
              placeholder="اسمك الكامل"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">رقم هاتفك</label>
            <input type="tel" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="2X XXX XXX" dir="ltr"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
          </div>
          <button onClick={register} disabled={!riderName || !riderPhone} className="btn-primary">
            دخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">🛵 {riderName}</h1>
          <p className="text-xs text-gray-500" dir="ltr">{riderPhone}</p>
        </div>
        <button onClick={() => { localStorage.removeItem("rider"); setRegistered(false); }}
          className="text-xs text-red-400">خروج</button>
      </div>

      {/* Push notification */}
      {notifStatus === "granted" ? (
        <div className="text-green-600 text-xs mb-3 text-center">✅ الإشعارات مفعلة</div>
      ) : (
        <button
          onClick={subscribePush}
          className="w-full mb-3 py-2 rounded-xl text-sm font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          🔔 تفعيل الإشعارات
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("available")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "available" ? "bg-amber-400 text-amber-900" : "bg-gray-100 text-gray-600"}`}>
          متاح ({orders.length})
        </button>
        <button onClick={() => setTab("mine")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${tab === "mine" ? "bg-amber-400 text-amber-900" : "bg-gray-100 text-gray-600"}`}>
          طلباتي ({myOrders.length})
        </button>
      </div>

      {loading && <div className="text-center text-gray-400 py-8">جاري التحميل...</div>}

      {tab === "available" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && (
            <div className="card text-center text-gray-400 py-8">لا توجد طلبات جديدة الآن</div>
          )}
          {orders.map((order) => (
            <div key={order.id} className="card border-l-4 border-l-amber-400 text-right">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-500 dir-ltr" dir="ltr">{order.order_number}</span>
                <span className="font-bold text-amber-600">{formatFee(order.delivery_fee)}</span>
              </div>
              <div className="text-sm font-semibold mb-1">📍 من: {order.store_name}</div>
              {order.store_address && <div className="text-xs text-gray-500 mb-2">{order.store_address}</div>}
              <div className="text-sm font-semibold mb-1">
                🏠 إلى:{" "}
                {order.customer_lat && order.customer_lng ? (
                  <a
                    href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    📍 عرض على الخريطة
                  </a>
                ) : (
                  order.customer_address
                )}
              </div>
              {order.distance_km && <div className="text-xs text-gray-500 mb-2">{order.distance_km} كم</div>}
              <div className="bg-gray-50 rounded-lg p-2 mb-3">
                <div className="text-xs text-gray-500 mb-1">الطلب:</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">{order.items_description}</div>
              </div>
              <button onClick={() => acceptOrder(order.id)} className="btn-primary">
                ✅ قبول الطلب
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-3">
          {myOrders.length === 0 && !loading && (
            <div className="card text-center text-gray-400 py-8">ليس لديك طلبات نشطة</div>
          )}
          {myOrders.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className="card border-l-4 border-l-blue-400 text-right">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500" dir="ltr">{order.order_number}</span>
                  <span className="font-bold text-amber-600">{formatFee(order.delivery_fee)}</span>
                </div>
                <div className="text-sm font-semibold mb-1">📍 {order.store_name}</div>
                <div className="text-sm font-semibold mb-1">
                  🏠{" "}
                  {order.customer_lat && order.customer_lng ? (
                    <a
                      href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      📍 عرض على الخريطة
                    </a>
                  ) : (
                    order.customer_address
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-2 mb-2">
                  <div className="text-sm whitespace-pre-wrap">{order.items_description}</div>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <a href={`tel:${order.customer_phone}`} className="text-blue-600 font-medium" dir="ltr">
                    📞 {order.customer_phone}
                  </a>
                  <span className="text-gray-600">{order.customer_name}</span>
                </div>
                {next && (
                  <button onClick={() => updateStatus(order.id, next.next)}
                    className="btn-primary">
                    {next.label}
                  </button>
                )}
                {order.status === "delivered" && (
                  <div className="text-center text-green-600 font-bold py-2">✅ تم التسليم!</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center text-gray-400 mt-4">يتحدث تلقائياً كل 15 ثانية</p>
    </div>
  );
}
