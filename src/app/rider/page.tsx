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

interface RiderProfile {
  name: string;
  phone: string;
  role: string;
  status: string;
  rider_id?: string;
}

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  accepted:  { label: "📦 وصلت للمحل وأخذت الطلب", next: "picked_up" },
  picked_up: { label: "✅ سلمت للزبون", next: "delivered" },
};

export default function RiderPage() {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [sharing, setSharing] = useState<Record<string, boolean>>({});
  const watchIds = useRef<Record<string, number>>({});

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (!saved) {
      window.location.href = "/register/rider";
      return;
    }
    const user = JSON.parse(saved);
    if (user.role !== "rider") {
      window.location.href = "/";
      return;
    }
    if (user.status === "pending" || user.status === "rejected") {
      window.location.href = "/register/rider";
      return;
    }
    setRider(user);
    setReady(true);

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotifStatus("granted");
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [ready]);

  async function fetchOrders() {
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch("/api/orders?status=pending"),
        fetch("/api/orders"),
      ]);
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      setOrders(pendingData.orders || []);
      if (rider) {
        setMyOrders((allData.orders || []).filter((o: Order) =>
          ["accepted","picked_up"].includes(o.status) &&
          o.customer_phone
        ));
      }
    } finally {
      setLoading(false);
    }
  }

  async function acceptOrder(orderId: string) {
    if (!rider) return;
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted", rider_name: rider.name, rider_phone: rider.phone }),
    });
    fetchOrders();
    startSharing(orderId);
  }

  function startSharing(orderId: string) {
    if (sharing[orderId] || !navigator.geolocation) return;
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

  async function subscribePush() {
    if (!rider) return;
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
        body: JSON.stringify({ subscription: sub.toJSON(), rider_name: rider.name, rider_phone: rider.phone }),
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

  async function checkRiderStatus() {
    if (!rider) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/riders/status?phone=${encodeURIComponent(rider.phone)}`);
      const data = await res.json();
      if (data.status !== "active") {
        const saved = localStorage.getItem("tawsil_user");
        if (saved) {
          const user = JSON.parse(saved);
          user.status = data.status;
          localStorage.setItem("tawsil_user", JSON.stringify(user));
        }
        window.location.href = "/register/rider";
      }
    } finally {
      setChecking(false);
    }
  }

  function logout() {
    localStorage.removeItem("tawsil_user");
    window.location.href = "/";
  }

  if (!ready || !rider) return null;

  return (
    <div>
      {/* Rider header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-red-500/15 border border-red-500/30 rounded-full flex items-center justify-center text-lg">
            🛵
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{rider.name}</h1>
            <p className="text-xs text-gray-500" dir="ltr">{rider.phone}</p>
          </div>
        </div>
        <button onClick={logout}
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
                  <div className={`w-full mt-2 py-2 px-3 rounded-xl text-sm font-medium text-center ${
                    sharing[order.id]
                      ? "bg-green-500/10 text-green-400 border border-green-500/30"
                      : "bg-red-500/10 text-red-400 border border-red-500/30"
                  }`}>
                    {sharing[order.id] ? "🟢 موقعك يُشارك مع الزبون" : "⏳ جاري تفعيل مشاركة الموقع..."}
                  </div>
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
