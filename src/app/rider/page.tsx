"use client";

import { useState, useEffect, useRef } from "react";

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
  rider_lat: number | null;
  rider_lng: number | null;
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
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const watchIds = useRef<Record<string, number>>({});

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

  const toggleSharing = (orderId: string) => {
    if (sharing[orderId]) {
      if (watchIds.current[orderId]) navigator.geolocation.clearWatch(watchIds.current[orderId]);
      setSharing(prev => ({ ...prev, [orderId]: false }));
    } else {
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          await fetch(`/api/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rider_lat: pos.coords.latitude, rider_lng: pos.coords.longitude }),
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      watchIds.current[orderId] = id;
      setSharing(prev => ({ ...prev, [orderId]: true }));
    }
  };

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
        <h1 className="text-xl font-bold text-white mb-5">🛵 لوحة الراكب</h1>
        <div className="card space-y-4">
          <p className="text-sm text-gray-400">أدخل معلوماتك لتبدأ استقبال الطلبات</p>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">اسمك</label>
            <input type="text" value={riderName} onChange={(e) => setRiderName(e.target.value)}
              placeholder="اسمك الكامل"
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">رقم هاتفك</label>
            <input type="tel" value={riderPhone} onChange={(e) => setRiderPhone(e.target.value)}
              placeholder="2X XXX XXX" dir="ltr"
              className="input !text-left" />
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
      {/* Rider header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-red-500/15 border border-red-500/30 rounded-full flex items-center justify-center text-lg">
            🛵
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{riderName}</h1>
            <p className="text-xs text-gray-500" dir="ltr">{riderPhone}</p>
          </div>
        </div>
        <button onClick={() => { localStorage.removeItem("rider"); setRegistered(false); }}
          className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors">خروج</button>
      </div>

      {/* Push notification */}
      {notifStatus === "granted" ? (
        <div className="text-green-400 text-xs mb-3 text-center bg-green-500/10 border border-green-500/20 rounded-lg py-2">✅ الإشعارات مفعلة</div>
      ) : (
        <button
          onClick={subscribePush}
          className="w-full mb-3 py-2.5 rounded-xl text-sm font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/15 transition-colors"
        >
          🔔 تفعيل الإشعارات
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("available")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "available"
              ? "bg-red-500 text-white"
              : "bg-[#161b27] text-gray-400 border border-[#1e2535]"
          }`}>
          متاح
          {orders.length > 0 && (
            <span className={`mr-1.5 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-bold px-1.5 ${
              tab === "available" ? "bg-white/20 text-white" : "bg-red-500/20 text-red-400"
            }`}>{orders.length}</span>
          )}
        </button>
        <button onClick={() => setTab("mine")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "mine"
              ? "bg-blue-500 text-white"
              : "bg-[#161b27] text-gray-400 border border-[#1e2535]"
          }`}>
          طلباتي ({myOrders.length})
        </button>
      </div>

      {loading && <div className="text-center text-gray-500 py-8">جاري التحميل...</div>}

      {tab === "available" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && (
            <div className="card text-center text-gray-500 py-8">لا توجد طلبات جديدة الآن</div>
          )}
          {orders.map((order) => (
            <div key={order.id} className="card border-r-4 border-r-red-500 text-right">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-600" dir="ltr">{order.order_number}</span>
                <span className="font-bold text-red-400 text-lg">{formatFee(order.delivery_fee)}</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">📍 من: {order.store_name}</div>
              {order.store_address && <div className="text-xs text-gray-500 mb-2">{order.store_address}</div>}
              <div className="text-sm font-bold text-white mb-1">
                🏠 إلى:{" "}
                {order.customer_lat && order.customer_lng ? (
                  <a
                    href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-500/25"
                  >
                    📍 عرض على الخريطة
                  </a>
                ) : (
                  <span className="text-gray-300">{order.customer_address}</span>
                )}
              </div>
              {order.distance_km && <div className="text-xs text-gray-500 mb-2">{order.distance_km} كم</div>}
              <div className="bg-[#0d1117] rounded-xl p-3 mb-3 border border-[#1e2535]">
                <div className="text-xs text-gray-500 mb-1">الطلب:</div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">{order.items_description}</div>
              </div>
              <button onClick={() => acceptOrder(order.id)} className="btn-primary">
                قبول الطلب
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-3">
          {myOrders.length === 0 && !loading && (
            <div className="card text-center text-gray-500 py-8">ليس لديك طلبات نشطة</div>
          )}
          {myOrders.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className="card border-r-4 border-r-blue-500 text-right">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-600" dir="ltr">{order.order_number}</span>
                  <span className="font-bold text-red-400">{formatFee(order.delivery_fee)}</span>
                </div>
                <div className="text-sm font-bold text-white mb-1">📍 {order.store_name}</div>
                <div className="text-sm font-bold text-white mb-1">
                  🏠{" "}
                  {order.customer_lat && order.customer_lng ? (
                    <a
                      href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-500/25"
                    >
                      📍 عرض على الخريطة
                    </a>
                  ) : (
                    <span className="text-gray-300">{order.customer_address}</span>
                  )}
                </div>
                <div className="bg-[#0d1117] rounded-xl p-3 mb-2 border border-[#1e2535]">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{order.items_description}</div>
                </div>
                <div className="flex justify-between text-sm mb-3 items-center">
                  <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-500/25" dir="ltr">
                    📞 {order.customer_phone}
                  </a>
                  <span className="text-gray-300 font-medium">{order.customer_name}</span>
                </div>
                {order.status !== "delivered" && (
                  <button
                    onClick={() => toggleSharing(order.id)}
                    className={`w-full mt-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      sharing[order.id]
                        ? "bg-green-500/20 text-green-400 border border-green-500/40"
                        : "bg-[#0d1117] border border-[#2a3347] text-gray-400 hover:border-green-500/40"
                    }`}
                  >
                    {sharing[order.id] ? "🟢 جاري مشاركة موقعك..." : "📍 شارك موقعك مع الزبون"}
                  </button>
                )}
                {next && (
                  <button onClick={() => updateStatus(order.id, next.next)}
                    className="btn-primary mt-2">
                    {next.label}
                  </button>
                )}
                {order.status === "delivered" && (
                  <div className="text-center text-green-400 font-bold py-2">✅ تم التسليم!</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center text-gray-600 mt-4">يتحدث تلقائياً كل 15 ثانية</p>
    </div>
  );
}
