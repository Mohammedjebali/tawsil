"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Store, ClipboardList, Settings, Plus, Trash2, Edit3, Check, Clock, ChefHat, Package, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import { captureError } from "@/lib/sentry";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { useRealtimeContext } from "@/components/RealtimeProvider";
import Link from "next/link";


interface StoreData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  is_approved: boolean;
  opening_time: string | null;
  closing_time: string | null;
  delivery_fee: number;
  logo_url?: string | null;
}

interface Category {
  id: string;
  name: string;
  store_id: string;
  sort_order: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_available: boolean;
  image_url: string | null;
}

interface StoreOrder {
  id: string;
  order_id: string;
  store_id: string;
  items: { item_id: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  status: string;
  store_confirmed_at: string | null;
  store_ready_at: string | null;
  orders: {
    order_number: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    status: string;
    created_at: string;
  };
}

type Tab = "orders" | "menu" | "settings";

const CATEGORIES_LIST = ["restaurant", "grocery", "pharmacy", "bakery", "cafe", "supermarket"];

export default function StoreOwnerDashboard() {
  const { t, isRtl } = useLang();
  const router = useRouter();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");

  // Orders
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Menu
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", category_id: "" });
  const [addingCat, setAddingCat] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // Settings
  const [settings, setSettings] = useState({ name: "", description: "", category: "", phone: "", address: "", opening_time: "", closing_time: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  useEffect(() => {
    loadStore();
    registerStoreOwnerPush();
  }, []);

  async function registerStoreOwnerPush() {
    const saved = localStorage.getItem("tawsil_store_owner");
    if (!saved) return;
    let owner: { id: string } | null = null;
    try { owner = JSON.parse(saved); } catch (e) { captureError(e); return; }
    if (!owner?.id) return;

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), store_owner_id: owner.id }),
      });
    } catch (e) { captureError(e); }
  }

  async function loadStore() {
    const saved = localStorage.getItem("tawsil_store_owner");
    if (!saved) { setUnauthenticated(true); setLoading(false); return; }

    let owner: { id: string } | null = null;
    try { owner = JSON.parse(saved); } catch (e) { captureError(e); setUnauthenticated(true); setLoading(false); return; }

    try {
      const res = await fetch(`/api/stores?owner_id=${owner!.id}`);
      const data = await res.json();

      if (data.stores?.length > 0) {
        const s = data.stores[0];
        setStore(s);
        setSettings({
          name: s.name || "",
          description: s.description || "",
          category: s.category || "restaurant",
          phone: s.phone || "",
          address: s.address || "",
          opening_time: s.opening_time || "",
          closing_time: s.closing_time || "",
        });
        loadOrders(s.id);
        loadMenu(s.id);
      }
    } catch (e) { captureError(e); }
    setLoading(false);
  }

  async function loadOrders(storeId: string, silent = false) {
    if (!silent) setOrdersLoading(true);
    try {
      const res = await fetch(`/api/store-orders?store_id=${storeId}`);
      const data = await res.json();
      setOrders(data.store_orders || []);
    } catch (e) { captureError(e); }
    if (!silent) setOrdersLoading(false);
  }

  // Realtime: subscribe to store_orders and orders for this store
  const storeOrderSubs = useMemo(() => {
    if (!store) return [];
    return [
      {
        table: "store_orders",
        event: "*" as const,
        filter: `store_id=eq.${store.id}`,
        callback: () => loadOrders(store.id, true),
      },
      {
        table: "orders",
        event: "UPDATE" as const,
        callback: () => loadOrders(store.id, true),
      },
    ];
  }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeSubscription(storeOrderSubs, {
    channelName: store ? `store-owner-${store.id}` : undefined,
    enabled: !!store,
  });

  // Refresh on reconnect after disconnect
  const { lastReconnect } = useRealtimeContext();
  useEffect(() => {
    if (lastReconnect && store) loadOrders(store.id, true);
  }, [lastReconnect]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMenu(storeId: string) {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        fetch(`/api/stores/${storeId}/categories`),
        fetch(`/api/stores/${storeId}/items`),
      ]);
      const catsData = await catsRes.json();
      const itemsData = await itemsRes.json();
      setCategories(catsData.categories || []);
      setMenuItems(itemsData.items || []);
    } catch (e) { captureError(e); }
  }

  async function updateOrderStatus(orderId: string, status: string, extra?: Record<string, unknown>) {
    try {
      await fetch("/api/store-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status, ...extra }),
      });
      if (store) loadOrders(store.id);
    } catch (e) { captureError(e); }
  }

  async function addCategory() {
    if (!store || !newCatName.trim()) return;
    setAddingCat(true);
    try {
      await fetch(`/api/stores/${store.id}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      setNewCatName("");
      loadMenu(store.id);
    } catch (e) { captureError(e); }
    setAddingCat(false);
  }

  async function addMenuItem() {
    if (!store || !newItem.name.trim() || !newItem.price) return;
    setAddingItem(true);
    try {
      await fetch(`/api/stores/${store.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name.trim(),
          description: newItem.description.trim() || null,
          price: parseInt(newItem.price),
          category_id: newItem.category_id || null,
        }),
      });
      setNewItem({ name: "", description: "", price: "", category_id: "" });
      loadMenu(store.id);
    } catch (e) { captureError(e); }
    setAddingItem(false);
  }

  async function deleteItem(itemId: string) {
    if (!store) return;
    try {
      await fetch(`/api/stores/${store.id}/items/${itemId}`, { method: "DELETE" });
      loadMenu(store.id);
    } catch (e) { captureError(e); }
  }

  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function uploadLogo(file: File) {
    if (!store) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeId", store.id);
      formData.append("itemName", "logo");
      const res = await fetch("/api/store-owners/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/stores/${store.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo_url: data.url }),
        });
        loadStore();
      }
    } catch (e) { captureError(e); }
    setUploadingLogo(false);
  }

  async function uploadItemImg(itemId: string, file: File) {
    if (!store) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeId", store.id);
      formData.append("itemName", itemId);
      const res = await fetch("/api/store-owners/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/stores/${store.id}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: data.url }),
        });
        loadMenu(store.id);
      }
    } catch (e) { captureError(e); }
  }

  async function saveSettings() {
    if (!store) return;
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description || null,
          category: settings.category,
          phone: settings.phone || null,
          address: settings.address || null,
          opening_time: settings.opening_time || null,
          closing_time: settings.closing_time || null,
        }),
      });
      setSettingsMsg(t("profileSaved"));
      loadStore();
    } catch (e) { captureError(e); }
    setSavingSettings(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/2" />
          <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (unauthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 mb-6">Please log in first to access your store dashboard.</p>
        <Link href="/login" className="btn-primary inline-block no-underline">
          {t("login")}
        </Link>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t("registerStore")}</h2>
        <p className="text-slate-500 mb-6">{t("registerStoreDesc")}</p>
        <Link href="/store-owner/register" className="btn-primary inline-block no-underline">
          {t("registerStore")}
        </Link>
      </div>
    );
  }

  if (!store.is_approved) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{t("storePendingApproval")}</h2>
        <p className="text-slate-500 mb-2">{t("storePendingDesc")}</p>
        <p className="text-lg font-semibold text-slate-700 mt-4">{store.name}</p>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const activeOrders = orders.filter((o) => ["confirmed", "preparing"].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === "ready");

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
    { key: "orders", label: t("storeOrders"), icon: ClipboardList },
    { key: "menu", label: t("manageMenu"), icon: ChefHat },
    { key: "settings", label: t("storeSettings"), icon: Settings },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700">
          <BackArrow size={22} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{store.name}</h1>
          <p className="text-xs text-slate-500">{t("storeOwnerDashboard")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-4">
          {ordersLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("noStoreOrders")}</p>
            </div>
          ) : (
            <>
              {/* Pending */}
              {pendingOrders.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-1">
                    <AlertCircle size={14} /> {t("pending")} ({pendingOrders.length})
                  </h3>
                  {pendingOrders.map((o) => (
                    <OrderCard key={o.id} order={o} t={t} onAction={updateOrderStatus} />
                  ))}
                </div>
              )}
              {/* Active */}
              {activeOrders.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-blue-600 mb-2">{t("activeOrders")} ({activeOrders.length})</h3>
                  {activeOrders.map((o) => (
                    <OrderCard key={o.id} order={o} t={t} onAction={updateOrderStatus} />
                  ))}
                </div>
              )}
              {/* Ready */}
              {readyOrders.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-green-600 mb-2">{t("statusReady")} ({readyOrders.length})</h3>
                  {readyOrders.map((o) => (
                    <OrderCard key={o.id} order={o} t={t} onAction={updateOrderStatus} />
                  ))}
                </div>
              )}
            </>
          )}
          <button
            onClick={() => store && loadOrders(store.id)}
            className="btn-secondary w-full"
          >
            {t("refresh")}
          </button>
        </div>
      )}

      {/* Menu Tab */}
      {tab === "menu" && (
        <div className="space-y-6">
          {/* Add category */}
          <div className="card">
            <h3 className="text-sm font-bold text-slate-700 mb-3">{t("addCategory")}</h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={t("categoryName")}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button
                onClick={addCategory}
                disabled={addingCat || !newCatName.trim()}
                className="btn-primary px-4"
                style={{ opacity: addingCat ? 0.6 : 1 }}
              >
                <Plus size={18} />
              </button>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {categories.map((c) => (
                  <span key={c.id} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Add item */}
          <div className="card">
            <h3 className="text-sm font-bold text-slate-700 mb-3">{t("addItem")}</h3>
            <div className="space-y-3">
              <input
                className="input w-full"
                placeholder={t("itemName")}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <input
                className="input w-full"
                placeholder={t("itemDescription")}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input w-full"
                  type="number"
                  placeholder={t("itemPrice")}
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
                <select
                  className="input w-full"
                  value={newItem.category_id}
                  onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                >
                  <option value="">{t("uncategorized")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addMenuItem}
                disabled={addingItem || !newItem.name.trim() || !newItem.price}
                className="btn-primary w-full"
                style={{ opacity: addingItem ? 0.6 : 1 }}
              >
                {addingItem ? t("submitting") : t("addItem")}
              </button>
            </div>
          </div>

          {/* Existing items */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">{t("storeMenu")} ({menuItems.length})</h3>
            {menuItems.length === 0 ? (
              <p className="text-sm text-slate-400">{t("noMenuItems")}</p>
            ) : (
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <div key={item.id} className="card flex items-center gap-3 py-3">
                    <label style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, overflow: "hidden", background: "#F8FAFC" }}>
                      {item.image_url
                        ? <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Plus size={16} style={{ color: "#94A3B8" }} />
                      }
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadItemImg(item.id, f); }} />
                    </label>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {(item.price / 1000).toFixed(3)} {t("dt")}
                        {item.category_id && categories.find((c) => c.id === item.category_id) && (
                          <> &middot; {categories.find((c) => c.id === item.category_id)!.name}</>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === "settings" && (
        <div className="space-y-4">
          {/* Profile pic */}
          <div className="flex items-center gap-4">
            <label style={{ width: 72, height: 72, borderRadius: 16, border: "2px dashed #CBD5E1", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, overflow: "hidden", background: "#F8FAFC" }}>
              {store?.logo_url
                ? <img src={store.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Store size={28} style={{ color: "#94A3B8" }} />
              }
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
            </label>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{t("storeProfilePic")}</div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{uploadingLogo ? t("uploading") + "..." : t("clickToUpload")}</div>
            </div>
          </div>

          <div>
            <label className="label">{t("storeName")}</label>
            <input className="input w-full" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("storeDescription")}</label>
            <textarea className="input w-full" rows={3} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("storeCategory")}</label>
            <select className="input w-full" value={settings.category} onChange={(e) => setSettings({ ...settings, category: e.target.value })}>
              {CATEGORIES_LIST.map((c) => (
                <option key={c} value={c}>{t(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("storePhone")}</label>
            <input className="input w-full" type="tel" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">{t("storeAddress")}</label>
            <input className="input w-full" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("storeOpeningTime")}</label>
              <input className="input w-full" type="time" value={settings.opening_time} onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })} />
            </div>
            <div>
              <label className="label">{t("storeClosingTime")}</label>
              <input className="input w-full" type="time" value={settings.closing_time} onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })} />
            </div>
          </div>
          {settingsMsg && <p className="text-sm text-green-600">{settingsMsg}</p>}

          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="btn-primary w-full"
            style={{ opacity: savingSettings ? 0.6 : 1 }}
          >
            {savingSettings ? t("updating") : t("saveChanges")}
          </button>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  t,
  onAction,
}: {
  order: StoreOrder;
  t: (key: string) => string;
  onAction: (id: string, status: string, extra?: Record<string, unknown>) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    confirmed: "bg-blue-50 text-blue-700",
    preparing: "bg-purple-50 text-purple-700",
    ready: "bg-green-50 text-green-700",
    picked_up: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-50 text-red-600",
  };

  const statusLabels: Record<string, string> = {
    pending: t("pending"),
    confirmed: t("statusConfirmed"),
    preparing: t("statusPreparing"),
    ready: t("statusReady"),
    picked_up: t("statusPickedUp"),
  };

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-sm text-slate-900">{order.orders?.order_number}</p>
          <p className="text-xs text-slate-500">{order.orders?.customer_name}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || ""}`}>
          {statusLabels[order.status] || order.status}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-slate-600">
            <span>{item.quantity}x {item.name}</span>
            <span>{((item.price * item.quantity) / 1000).toFixed(3)} {t("dt")}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100 pt-1 mt-1">
          <span>{t("subtotal")}</span>
          <span>{(order.subtotal / 1000).toFixed(3)} {t("dt")}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {order.status === "pending" && (
          <button onClick={() => onAction(order.id, "confirmed")} className="btn-primary flex-1 text-sm py-2">
            <Check size={14} className="inline mr-1" /> {t("confirmStoreOrder")}
          </button>
        )}
        {order.status === "confirmed" && (
          <button onClick={() => onAction(order.id, "preparing")} className="btn-primary flex-1 text-sm py-2">
            <ChefHat size={14} className="inline mr-1" /> {t("markPreparing")}
          </button>
        )}
        {order.status === "preparing" && (
          <button onClick={() => onAction(order.id, "ready")} className="btn-primary flex-1 text-sm py-2">
            <Package size={14} className="inline mr-1" /> {t("markReady")}
          </button>
        )}
        {order.orders?.customer_phone && (
          <a href={`tel:${order.orders.customer_phone}`} className="btn-secondary text-sm py-2 px-3 no-underline">
            {t("callCustomer")}
          </a>
        )}
      </div>

      {/* Cancel button for pending/confirmed orders */}
      {["pending", "confirmed"].includes(order.status) && (
        confirmCancel ? (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-slate-600 mb-2">{t("cancelConfirm")}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCancel(false)} className="flex-1 text-xs font-semibold py-2 rounded-lg bg-slate-100 text-slate-600">
                {t("back")}
              </button>
              <button
                onClick={() => { onAction(order.id, "cancelled", { cancelled_by: "store_owner" }); setConfirmCancel(false); }}
                className="flex-1 text-xs font-semibold py-2 rounded-lg bg-red-600 text-white"
              >
                {t("cancelOrder")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmCancel(true)}
            className="mt-2 w-full text-xs font-semibold py-2 rounded-lg border border-red-200 bg-red-50 text-red-600"
          >
            {t("cancelOrder")}
          </button>
        )
      )}
    </div>
  );
}
