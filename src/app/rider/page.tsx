"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bell, BellOff, Package, MapPin, Phone, Navigation, CheckCircle2, DollarSign } from "lucide-react";
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
  store_lat: number | null;
  store_lng: number | null;
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
  is_online?: boolean;
  db_id?: string;
}

function formatFee(m: number) { return `${(m/1000).toFixed(3)} DT`; }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function SlideToAccept({ onAccept, disabled, label }: { onAccept: () => void; disabled: boolean; label: string }) {
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(300);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const thumbSize = 48;

  useEffect(() => {
    if (trackRef.current) setTrackWidth(trackRef.current.clientWidth);
  }, []);

  const maxOffset = trackWidth - thumbSize - 8;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const pct = Math.min(Math.max(diff / maxOffset, 0), 1);
    setProgress(pct);
    if (pct >= 0.92) {
      setDragging(false);
      setProgress(1);
      if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
      setTimeout(() => { setProgress(0); onAccept(); }, 150);
    }
  };

  const handleTouchEnd = () => {
    if (progress < 0.92) { setDragging(false); setProgress(0); }
  };

  const thumbOffset = 4 + progress * maxOffset;

  return (
    <div
      ref={trackRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "relative", height: "56px", borderRadius: "999px",
        background: "rgba(99,102,241,0.08)", border: "1.5px solid rgba(99,102,241,0.2)",
        overflow: "hidden", userSelect: "none", touchAction: "none",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: "999px",
        background: "linear-gradient(90deg, rgba(99,102,241,0.1), rgba(99,102,241,0.25))",
        width: `${thumbOffset + thumbSize / 2}px`,
        transition: dragging ? "none" : "width 0.3s ease",
      }} />
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 600, color: "#6366f1",
        opacity: Math.max(0, 1 - progress * 2.5), pointerEvents: "none",
      }}>
        {disabled ? "..." : label}
      </div>
      <div style={{
        position: "absolute", top: "4px",
        left: `${thumbOffset}px`,
        width: `${thumbSize}px`, height: `${thumbSize}px`, borderRadius: "999px",
        background: disabled ? "#cbd5e1" : "#6366f1",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: dragging ? "none" : "left 0.3s ease",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  );
}

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
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [priceUpdating, setPriceUpdating] = useState<Record<string, boolean>>({});
  const [priceSuccess, setPriceSuccess] = useState<Record<string, boolean>>({});
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [riderPos, setRiderPos] = useState<{lat: number; lng: number} | null>(null);
  const watchIds = useRef<Record<string, number>>({});
  const prevOrderCount = useRef(0);
  const posWatchId = useRef<number | null>(null);

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
    // Verify rider still exists and is active in DB
    fetch(`/api/riders/status?phone=${encodeURIComponent(user.phone)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.id || data.status !== "active") {
          localStorage.removeItem("tawsil_user");
          window.location.href = "/login";
          return;
        }
        setIsOnline(!!data.is_online);
        user.db_id = data.id;
        user.is_online = !!data.is_online;
        setRider({ ...user });
      })
      .catch(() => {});

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
    const interval = setInterval(fetchOrders, 4000); // fast poll so taken orders vanish quickly
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Track rider position for distance-to-store calculation
  useEffect(() => {
    if (!navigator.geolocation) return;
    posWatchId.current = navigator.geolocation.watchPosition(
      (pos) => setRiderPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000 }
    );
    return () => { if (posWatchId.current !== null) navigator.geolocation.clearWatch(posWatchId.current); };
  }, []);

  async function toggleOnline() {
    if (!rider?.db_id || toggling) return;
    setToggling(true);
    const next = !isOnline;
    try {
      await fetch(`/api/riders/${rider.db_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: next }),
      });
      setIsOnline(next);
    } finally {
      setToggling(false);
    }
  }

  async function fetchOrders() {
    try {
      const excludeParam = rider?.db_id ? `&exclude_passed_by=${rider.db_id}` : "";
      const [pendingRes, allRes] = await Promise.all([
        fetch(`/api/orders?status=pending${excludeParam}`),
        fetch("/api/orders"),
      ]);
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      const newOrders = pendingData.orders || [];
      prevOrderCount.current = newOrders.length;
      setOrders(newOrders);
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

  async function passOrder(orderId: string) {
    if (!rider?.db_id) return;
    await fetch(`/api/orders/${orderId}/pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rider_id: rider.db_id }),
    });
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  async function acceptOrder(orderId: string) {
    if (!rider) return;
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "accepted", rider_name: rider.name, rider_phone: rider.phone }),
    });
    if (res.status === 409) {
      const err = await res.json();
      if (err.error === "rider_busy") {
        alert(t("riderBusy"));
      } else {
        alert(t("orderTaken"));
      }
      fetchOrders();
      return;
    }
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

  async function updateActualPrice(orderId: string) {
    const priceStr = priceInputs[orderId];
    const priceDT = parseFloat(priceStr);
    if (!priceStr || isNaN(priceDT) || priceDT <= 0) return;
    setPriceUpdating(prev => ({ ...prev, [orderId]: true }));
    try {
      const body: Record<string, unknown> = { actual_goods_price: Math.round(priceDT * 1000) };
      const note = noteInputs[orderId]?.trim();
      if (note) body.price_note = note;
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setPriceSuccess(prev => ({ ...prev, [orderId]: true }));
      setTimeout(() => setPriceSuccess(prev => ({ ...prev, [orderId]: false })), 3000);
    } finally {
      setPriceUpdating(prev => ({ ...prev, [orderId]: false }));
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
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-500">{t("hi")}</div>
          <h1 className="text-lg font-bold text-slate-900">{rider.name}</h1>
        </div>
      </div>

      {/* Online/Offline toggle */}
      <button
        onClick={toggleOnline}
        disabled={toggling || !rider.db_id}
        className={`w-full py-3 rounded-xl text-base font-bold mb-3 transition-colors disabled:opacity-50 ${
          isOnline
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {toggling ? "..." : isOnline ? t("goOffline") : t("goOnline")}
      </button>

      {isOnline ? (
        <div className="flex items-center gap-2 text-emerald-700 text-sm mb-4 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          {t("youAreOnline")}
        </div>
      ) : (
        <div className="text-amber-700 text-sm mb-4 bg-amber-50 border border-amber-200 rounded-xl py-2.5 px-4 font-medium text-center">
          {t("youAreOffline")}
        </div>
      )}

      {/* Notification toggle */}
      {notifStatus === "granted" ? (
        <div className="flex items-center gap-2 text-emerald-700 text-xs mb-4 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4 font-medium">
          <Bell className="w-4 h-4" />
          {t("notificationEnabled")}
        </div>
      ) : (
        <button
          onClick={subscribePush}
          className="w-full mb-4 py-2.5 rounded-xl text-sm font-semibold border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
        >
          <Bell className="w-4 h-4" />
          {t("notificationEnable")}
        </button>
      )}

      {/* Tabs + orders — only show when online */}
      {isOnline && <>
      <div className="flex bg-slate-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("available")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "available"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500"
          }`}
        >
          {t("availableOrders")}
          {orders.length > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-xs font-bold px-1.5 ${
              tab === "available" ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-600"
            }`}>{orders.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === "mine"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500"
          }`}
        >
          {t("myOrders")} ({myOrders.length})
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card">
              <div className="flex justify-between items-start mb-3">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-6 w-20" />
              </div>
              <div className="skeleton h-4 w-2/3 mb-2" />
              <div className="skeleton h-3 w-1/2 mb-3" />
              <div className="skeleton h-16 w-full mb-3 rounded-xl" />
              <div className="flex gap-2">
                <div className="skeleton h-10 w-20 rounded-xl" />
                <div className="skeleton h-10 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "available" && (
        <div className="space-y-3">
          {orders.length === 0 && !loading && (
            <div className="card text-center text-slate-500 py-8">{t("noOrders")}</div>
          )}
          {[...orders].sort((a, b) => {
              // Sort by distance to store if rider position known
              if (riderPos && a.store_lat && a.store_lng && b.store_lat && b.store_lng) {
                return haversineKm(riderPos.lat, riderPos.lng, a.store_lat, a.store_lng)
                  - haversineKm(riderPos.lat, riderPos.lng, b.store_lat, b.store_lng);
              }
              return 0;
            }).map((order) => {const distToStore = riderPos && order.store_lat && order.store_lng
                ? haversineKm(riderPos.lat, riderPos.lng, order.store_lat, order.store_lng)
                : null; return (
            <div key={order.id} className="mission-card" style={{ borderLeft: "3px solid #6366f1" }}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs text-slate-400 font-mono" dir="ltr">{order.order_number}</span>
                <span className="font-bold text-indigo-600 text-lg">{formatFee(order.delivery_fee)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5">
                <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{t("from")}: {order.store_name}</span>
              </div>
              {order.store_address && <div className="text-xs text-slate-500 mb-1 pl-6">{order.store_address}</div>}
              {distToStore !== null && (
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mb-2 pl-6">
                  <Navigation className="w-3 h-3" />
                  {distToStore < 1 ? `${Math.round(distToStore * 1000)}m` : `${distToStore.toFixed(1)} km`} {t("fromYou")}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-700 mb-1.5">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{t("to")}:{" "}
                  {order.customer_lat && order.customer_lng ? (
                    <a
                      href={`https://www.google.com/maps?q=${order.customer_lat},${order.customer_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200"
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

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => passOrder(order.id)}
                  className="border border-slate-300 text-slate-500 px-3 py-1.5 rounded-lg text-xs"
                >
                  {t("passOrder")}
                </button>
              </div>
              <button
                onClick={() => acceptOrder(order.id)}
                className="btn-primary mt-2"
              >
                {t("acceptOrder")}
              </button>
            </div>
          );})}  
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
              <div key={order.id} className="mission-card" style={{ borderLeft: "3px solid #6366f1" }}>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs text-slate-400 font-mono" dir="ltr">{order.order_number}</span>
                  <span className="font-bold text-indigo-600">{formatFee(order.delivery_fee)}</span>
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
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200"
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
                    className="inline-flex items-center gap-2 border border-indigo-600 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold no-underline hover:bg-indigo-50 transition-colors"
                    dir="ltr"
                  >
                    <Phone className="w-4 h-4" />
                    {t("callCustomer")}
                  </a>
                  <span className="text-sm font-medium text-slate-700">{order.customer_name}</span>
                </div>

                {/* Price adjustment */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    {t("adjustPrice")}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">{t("actualPrice")} (DT)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={priceInputs[order.id] || ""}
                        onChange={e => setPriceInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">{t("priceNote")}</label>
                      <input
                        type="text"
                        placeholder={t("priceNote")}
                        value={noteInputs[order.id] || ""}
                        onChange={e => setNoteInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                      />
                    </div>
                    <button
                      onClick={() => updateActualPrice(order.id)}
                      disabled={priceUpdating[order.id] || !priceInputs[order.id]}
                      className="w-full py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {t("updatePrice")}
                    </button>
                    {priceSuccess[order.id] && (
                      <div className="text-xs text-emerald-600 font-medium text-center">{t("priceUpdatedSuccess")}</div>
                    )}
                  </div>
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
      </>}

    </div>
  );
}
