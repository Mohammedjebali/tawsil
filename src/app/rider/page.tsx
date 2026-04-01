"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bell, BellOff, Package, MapPin, Phone, Navigation, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import dynamic from "next/dynamic";
const RiderMapView = dynamic(() => import("@/components/RiderMapView"), { ssr: false });

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

export default function RiderPage() {
  const { t } = useLang();
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [ready, setReady] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!ready || !rider) return null;

  return (
    <div>
      {/* Welcome card */}
      <div className="card flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-blue-700" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-500">{t("hi")}</div>
          <h1 className="text-lg font-bold text-slate-900">{rider.name}</h1>
        </div>
      </div>

      {/* Notification toggle */}
      {notifStatus === "granted" ? (
        <div className="flex items-center gap-2 text-emerald-700 text-xs mb-4 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4 font-medium">
          <Bell className="w-4 h-4" />
          {t("notificationEnabled")}
        </div>
      ) : (
        <button
          onClick={subscribePush}
          className="w-full mb-4 py-2.5 rounded-xl text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
        >
          <Bell className="w-4 h-4" />
          {t("notificationEnable")}
        </button>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("available")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "available"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-500"
          }`}
        >
          {t("availableOrders")}
          {orders.length > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-bold px-1.5 ${
              tab === "available" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
            }`}>{orders.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "mine"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-500"
          }`}
        >
          {t("myOrders")} ({myOrders.length})
        </button>
      </div>

      {loading && <div className="text-center text-slate-500 py-8">{t("loading")}</div>}

      {tab === "available" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && (
            <div className="card text-center text-slate-500 py-8">{t("noOrders")}</div>
          )}
          {orders.map((order) => (
            <div key={order.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-slate-400 font-mono" dir="ltr">{order.order_number}</span>
                <span className="font-bold text-blue-700 text-lg">{formatFee(order.delivery_fee)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5">
                <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{t("from")}: {order.store_name}</span>
              </div>
              {order.store_address && <div className="text-xs text-slate-500 mb-2 pl-6">{order.store_address}</div>}

              <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{t("to")}:{" "}
                  {order.customer_lat && order.customer_lng ? (
                    <a
                      href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200"
                    >
                      <MapPin className="w-3 h-3" />
                      {t("viewOnMap")}
                    </a>
                  ) : (
                    <span>{order.customer_address}</span>
                  )}
                </span>
              </div>
              {order.distance_km && <div className="text-xs text-slate-500 mb-2 pl-6">{order.distance_km} {t("km")}</div>}

              <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                <div className="text-xs text-slate-400 mb-1">{t("whatYouOrdered")}:</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap">{order.items_description}</div>
              </div>

              <button onClick={() => acceptOrder(order.id)} className="btn-primary">
                {t("acceptOrder")}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-3">
          {myOrders.length === 0 && !loading && (
            <div className="card text-center text-slate-500 py-8">{t("noActiveOrders")}</div>
          )}
          {myOrders.map((order) => {
            const isAccepted = order.status === "accepted";
            const isPickedUp = order.status === "picked_up";
            return (
              <div key={order.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs text-slate-400 font-mono" dir="ltr">{order.order_number}</span>
                  <span className="font-bold text-blue-700">{formatFee(order.delivery_fee)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5">
                  <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-semibold">{order.store_name}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {order.customer_lat && order.customer_lng ? (
                    <a
                      href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200"
                    >
                      <MapPin className="w-3 h-3" />
                      {t("viewOnMap")}
                    </a>
                  ) : (
                    <span>{order.customer_address}</span>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{order.items_description}</div>
                </div>

                {order.customer_lat && order.customer_lng && (
                  <div className="mb-3">
                    <RiderMapView
                      customerLat={order.customer_lat}
                      customerLng={order.customer_lng}
                      riderLat={order.rider_lat}
                      riderLng={order.rider_lng}
                    />
                  </div>
                )}

                <div className="flex justify-between items-center mb-3">
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-xs font-semibold border border-blue-200 no-underline"
                    dir="ltr"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {order.customer_phone}
                  </a>
                  <span className="text-sm font-medium text-slate-700">{order.customer_name}</span>
                </div>

                {/* Location sharing status */}
                {order.status !== "delivered" && (
                  <div className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-sm font-medium ${
                    sharing[order.id]
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    <Navigation className="w-4 h-4" />
                    {sharing[order.id] ? t("sharingLocation") : t("locating")}
                  </div>
                )}

                {isAccepted && (
                  <button
                    onClick={() => updateStatus(order.id, "picked_up")}
                    className="btn-primary mt-3"
                  >
                    <Package className="w-4 h-4" />
                    {t("pickedUp")}
                  </button>
                )}
                {isPickedUp && (
                  <button
                    onClick={() => updateStatus(order.id, "delivered")}
                    className="btn-primary mt-3"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t("delivered")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
