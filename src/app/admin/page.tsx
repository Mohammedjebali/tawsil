"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Store, Package, Users, Plus, Trash2, RefreshCw, XCircle, CheckCircle2, ShoppingCart, Coffee, Pill, UtensilsCrossed, Bike, UserCheck, Search, Star, LayoutDashboard, TrendingUp, Clock, Download, Pencil, Megaphone, Wallet } from "lucide-react";
import { useRealtimeSubscription } from "@/lib/useRealtimeSubscription";
import { useRealtimeContext } from "@/components/RealtimeProvider";

interface DashboardData {
  today: { total: number; delivered: number; cancelled: number; active: number; revenue: number; flagged: number; overallRevenue: number };
  riders: { total: number; online: number; busy: number; available: number };
  topStores: { name: string; count: number }[];
  recentOrders: { id: string; order_number: string; store_name: string; status: string; created_at: string }[];
}

interface StoreItem {
  id: string;
  name: string;
  category: string;
  address: string | null;
  is_active: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  store_name: string;
  customer_name: string;
  customer_phone: string;
  delivery_fee: number;
  actual_goods_price?: number;
  items_description?: string;
  rider_name?: string;
  created_at: string;
  flagged?: boolean;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_online?: boolean;
  is_blocked?: boolean;
  created_at: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  points?: number;
  is_blocked?: boolean;
  created_at: string;
  referred_by?: string;
  successful_referrals_count?: number;
}

interface CustomerStats {
  phone: string;
  total_orders: number;
  delivered_orders: number;
  total_spent_millimes: number;
  last_order_at: string | null;
}

interface RiderStats {
  phone: string;
  total_deliveries: number;
  total_earned: number;
  last_delivery_at: string | null;
}

interface StoreStats {
  store_name: string;
  order_count: number;
}

interface Announcement {
  id: string;
  message_ar: string | null;
  message_fr: string | null;
  message_en: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant: UtensilsCrossed,
  supermarket: ShoppingCart,
  pharmacy: Pill,
  bakery: Store,
  grocery: ShoppingCart,
  shop: Store,
  cafe: Coffee,
  other: Package,
};

const CATEGORIES = ["restaurant", "supermarket", "pharmacy", "bakery", "grocery", "shop", "other"];

function formatFee(m: number) { return `${(m / 1000).toFixed(3)} DT`; }
function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }); }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"dashboard" | "stores" | "orders" | "riders" | "customers" | "broadcast" | "fees">("dashboard");

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("restaurant");
  const [newAddress, setNewAddress] = useState("");
  const [storeLoading, setStoreLoading] = useState(false);
  const [pendingStores, setPendingStores] = useState<{ id: string; name: string; category: string; address: string | null; phone: string | null; owner_id: string | null; created_at: string }[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [riders, setRiders] = useState<Rider[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [riderStats, setRiderStats] = useState<Record<string, RiderStats>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [pointsDelta, setPointsDelta] = useState<Record<string, string>>({});
  const [pointsUpdating, setPointsUpdating] = useState<string | null>(null);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});

  const [storeStats, setStoreStats] = useState<Record<string, number>>({});

  // Broadcast state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [broadcastAr, setBroadcastAr] = useState("");
  const [broadcastFr, setBroadcastFr] = useState("");
  const [broadcastEn, setBroadcastEn] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Rider fee payment tracker state
  const FEE_PER_DELIVERY = 500; // millimes (service fee per delivery — rider owes weekly)
  const FLAT_DELIVERY_FEE = 1500; // millimes (customer pays)
  const RIDER_TAKE = 1000; // millimes (rider earns per delivery)
  const [feePayments, setFeePayments] = useState<Array<{ id: string; rider_phone: string; order_id: string; order_number: string; store_name: string; fee_amount: number; is_paid: boolean; paid_at: string | null; created_at: string }>>([]);

  // Fetch fee payments from DB
  useEffect(() => {
    if (tab !== "fees") return;
    fetch("/api/rider-fees")
      .then(r => r.json())
      .then(data => { if (data.fees) setFeePayments(data.fees); })
      .catch(() => {});
  }, [tab]);

  const [dash, setDash] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Orders tab filters
  const [filterStore, setFilterStore] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Rider inline edit
  const [editingRider, setEditingRider] = useState<string | null>(null);
  const [editRiderName, setEditRiderName] = useState("");
  const [editRiderPhone, setEditRiderPhone] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("adminAuth");
    if (saved === "zerba-321") setAuthed(true);
  }, []);

  const fetchStores = useCallback(async () => {
    setStoreLoading(true);
    try {
      const [res, pendingRes] = await Promise.all([
        fetch("/api/admin/stores"),
        fetch("/api/admin/pending-stores"),
      ]);
      if (res.ok) { const data = await res.json(); setStores(data.stores || []); }
      if (pendingRes.ok) { const pendingData = await pendingRes.json(); setPendingStores(pendingData.stores || []); }
    } catch {} finally { setStoreLoading(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {} finally { setOrdersLoading(false); }
  }, []);

  const fetchRiders = useCallback(async () => {
    setRidersLoading(true);
    try {
      const res = await fetch("/api/admin/riders");
      if (!res.ok) return;
      const data = await res.json();
      setRiders(data.riders || []);
    } catch {} finally { setRidersLoading(false); }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch("/api/customers");
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {} finally { setCustomersLoading(false); }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) return;
      const data = await res.json();
      setDash(data);
      setLastUpdated(new Date());
    } catch {} finally { setDashLoading(false); }
  }, []);

  const fetchCustomerStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/customers/stats");
      const data = await res.json();
      const map: Record<string, CustomerStats> = {};
      for (const s of data.stats || []) map[s.phone] = s;
      setCustomerStats(map);
    } catch {}
  }, []);

  const fetchRiderStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/riders/stats");
      const data = await res.json();
      const map: Record<string, RiderStats> = {};
      for (const s of data.stats || []) map[s.phone] = s;
      setRiderStats(map);
    } catch {}
  }, []);

  const fetchStoreStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stores/stats");
      const data = await res.json();
      const map: Record<string, number> = {};
      for (const s of data.stats || []) map[s.store_name] = s.order_count;
      setStoreStats(map);
    } catch {}
  }, []);

  const fetchAllAnnouncements = useCallback(async () => {
    try {
      // Use a query param to get all announcements for admin
      const res = await fetch("/api/announcements/all");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (authed) {
      fetchStores(); fetchOrders(); fetchRiders(); fetchCustomers(); fetchDashboard();
      fetchCustomerStats(); fetchRiderStats(); fetchStoreStats(); fetchAllAnnouncements();
    }
  }, [authed, fetchStores, fetchOrders, fetchRiders, fetchCustomers, fetchDashboard, fetchCustomerStats, fetchRiderStats, fetchStoreStats, fetchAllAnnouncements]);

  // Realtime: subscribe to orders, stores, riders for admin dashboard
  const adminSubs = useMemo(() => {
    if (!authed) return [];
    return [
      { table: "orders", event: "*" as const, callback: () => { fetchDashboard(); fetchOrders(); } },
      { table: "stores", event: "*" as const, callback: () => { fetchStores(); fetchDashboard(); } },
      { table: "riders", event: "*" as const, callback: () => { fetchRiders(); fetchDashboard(); } },
    ];
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeSubscription(adminSubs, {
    channelName: "admin-dashboard",
    enabled: authed,
  });

  // Refresh on reconnect
  const { lastReconnect } = useRealtimeContext();
  useEffect(() => {
    if (lastReconnect && authed) fetchDashboard();
  }, [lastReconnect]); // eslint-disable-line react-hooks/exhaustive-deps

  function login() {
    if (password === "zerba-321") {
      localStorage.setItem("adminAuth", password);
      setAuthed(true);
    }
  }

  async function addStore(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, category: newCategory, address: newAddress || null }),
    });
    setNewName("");
    setNewAddress("");
    fetchStores();
  }

  async function deleteStore(id: string) {
    await fetch(`/api/admin/stores?id=${id}`, { method: "DELETE" });
    fetchStores();
  }

  async function toggleStore(id: string, currentActive: boolean) {
    await fetch("/api/admin/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _toggle: true, id, is_active: !currentActive }),
    });
    fetchStores();
  }

  const [adminCancelReason, setAdminCancelReason] = useState<Record<string, string>>({});
  const [adminCancelConfirm, setAdminCancelConfirm] = useState<string | null>(null);

  async function cancelOrder(id: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled", cancelled_by: "admin", cancel_reason: adminCancelReason[id] || "" }),
    });
    setAdminCancelConfirm(null);
    setAdminCancelReason((prev) => ({ ...prev, [id]: "" }));
    fetchOrders();
  }

  async function addPoints(email: string) {
    const delta = parseInt(pointsDelta[email] || "0");
    if (!delta) return;
    setPointsUpdating(email);
    try {
      await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, points_delta: delta }),
      });
      setPointsDelta((prev) => ({ ...prev, [email]: "" }));
      fetchCustomers();
    } finally { setPointsUpdating(null); }
  }

  async function toggleBlockCustomer(email: string, currentBlocked: boolean) {
    await fetch("/api/customers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, is_blocked: !currentBlocked }),
    });
    fetchCustomers();
  }

  async function toggleBlockRider(id: string, currentBlocked: boolean) {
    await fetch(`/api/riders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_blocked: !currentBlocked }),
    });
    fetchRiders();
  }

  async function saveRiderEdit(id: string) {
    await fetch(`/api/riders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editRiderName, phone: editRiderPhone }),
    });
    setEditingRider(null);
    fetchRiders();
  }

  async function updateRiderStatus(id: string, status: "active" | "rejected") {
    await fetch(`/api/admin/riders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchRiders();
  }

  async function sendBroadcast() {
    if (!broadcastAr.trim() && !broadcastFr.trim() && !broadcastEn.trim()) return;
    setBroadcastSending(true);
    try {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ar: broadcastAr, message_fr: broadcastFr, message_en: broadcastEn }),
      });
      setBroadcastAr("");
      setBroadcastFr("");
      setBroadcastEn("");
      fetchAllAnnouncements();
    } finally { setBroadcastSending(false); }
  }

  async function toggleAnnouncement(id: string, currentActive: boolean) {
    await fetch("/api/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !currentActive }),
    });
    fetchAllAnnouncements();
  }

  // Orders filtering
  const filteredOrders = orders.filter((o) => {
    if (filterStore && o.store_name !== filterStore) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    if (filterDate) {
      const d = new Date(o.created_at);
      const now = new Date();
      if (filterDate === "today") {
        if (d.toDateString() !== now.toDateString()) return false;
      } else if (filterDate === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (d < weekAgo) return false;
      } else if (filterDate === "month") {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  const uniqueStoreNames = [...new Set(orders.map((o) => o.store_name))].sort();

  function exportCsv() {
    const headers = ["order_number", "created_at", "store_name", "customer_name", "customer_phone", "items_description", "delivery_fee", "actual_goods_price", "status", "rider_name"];
    const rows = filteredOrders.map((o) =>
      [
        o.order_number,
        o.created_at,
        o.store_name,
        o.customer_name,
        o.customer_phone,
        (o.items_description || "").replace(/[\n\r,]/g, " "),
        (o.delivery_fee / 1000).toFixed(3),
        o.actual_goods_price ? (o.actual_goods_price / 1000).toFixed(3) : "",
        o.status,
        o.rider_name || "",
      ].map((v) => `"${v}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tawsil-orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Login screen
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          </div>
          <div className="card">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Password"
              className="input mb-3"
            />
            <button onClick={login} className="btn-primary">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingRiders = riders.filter(r => r.status === "pending");
  const approvedRiders = riders.filter(r => r.status === "active");
  const rejectedRiders = riders.filter(r => r.status === "rejected");

  const TABS = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "stores" as const, label: "Stores", icon: Store },
    { key: "orders" as const, label: "Orders", icon: Package },
    { key: "riders" as const, label: "Riders", icon: Users, badge: pendingRiders.length },
    { key: "customers" as const, label: "Clients", icon: UserCheck },
    { key: "broadcast" as const, label: "Broadcast", icon: Megaphone },
    { key: "fees" as const, label: "Fees", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Tawsil Admin</h1>
          <button
            onClick={() => { localStorage.removeItem("adminAuth"); setAuthed(false); }}
            className="text-sm text-red-500 hover:text-red-600 font-medium"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 mb-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge ? (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-[11px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div>
            {dashLoading && !dash && <p className="text-slate-500 text-center py-5">Loading...</p>}
            {dash && (
              <div className="space-y-5">
                {/* Last updated */}
                {lastUpdated && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Last updated: {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                    </div>
                    <button onClick={fetchDashboard} className="text-xs text-indigo-600 font-medium hover:text-indigo-700">
                      <RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${dashLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                )}

                {/* Row 1: Stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">Orders Today</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{dash.today.total}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">Delivered</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">{dash.today.delivered}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-600">{formatFee(dash.today.overallRevenue)}</div>
                    <div className="text-xs text-slate-400 mt-1">Today: {formatFee(dash.today.revenue)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-xs font-medium text-slate-500">Active</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{dash.today.active}</div>
                  </div>
                  {dash.today.flagged > 0 && (
                    <div className="rounded-xl border border-red-200 bg-white p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-xs font-medium text-slate-500">Flagged</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{dash.today.flagged}</div>
                    </div>
                  )}
                </div>

                {/* Row 2: Riders */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Bike className="w-4 h-4 text-indigo-600" /> Rider Status
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-emerald-600">{dash.riders.online}</div>
                      <div className="text-xs text-slate-500">Online</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-amber-600">{dash.riders.busy}</div>
                      <div className="text-xs text-slate-500">Busy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-slate-400">{dash.riders.total - dash.riders.online}</div>
                      <div className="text-xs text-slate-500">Offline</div>
                    </div>
                  </div>
                </div>

                {/* Row 3: Top Stores */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4 text-indigo-600" /> Top Stores
                  </h3>
                  {dash.topStores.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">No orders yet</p>
                  )}
                  <div className="space-y-2">
                    {dash.topStores.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{s.name}</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">{s.count} orders</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 4: Recent Orders */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" /> Recent Orders
                  </h3>
                  {dash.recentOrders.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-2">No orders yet</p>
                  )}
                  <div className="space-y-2">
                    {dash.recentOrders.map((o) => (
                      <div key={o.id} className="flex items-center gap-3 text-sm">
                        <span className="font-mono font-semibold text-slate-700 min-w-[110px]">{o.order_number}</span>
                        <span className="flex-1 text-slate-600 truncate">{o.store_name}</span>
                        <span className={`badge badge-${o.status}`}>{o.status}</span>
                        <span className="text-xs text-slate-400">{formatTime(o.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stores Tab */}
        {tab === "stores" && (
          <div>
            {/* Pending marketplace stores */}
            {pendingStores.length > 0 && (
              <div className="card mb-5 border-amber-200 bg-amber-50">
                <h2 className="text-base font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Pending Approval ({pendingStores.length})
                </h2>
                <div className="space-y-2">
                  {pendingStores.map((ps) => {
                    const IconComp = CATEGORY_ICONS[ps.category] || Package;
                    return (
                      <div key={ps.id} className="bg-white rounded-xl p-3 flex items-center gap-3 border border-amber-100">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                          <IconComp className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900">{ps.name}</div>
                          <div className="text-xs text-slate-500">{ps.category}{ps.address ? ` — ${ps.address}` : ""}</div>
                          <div className="text-xs text-slate-400">{ps.phone || "No phone"} &middot; {formatDate(ps.created_at)}</div>
                        </div>
                        <button
                          onClick={async () => {
                            await fetch(`/api/stores/${ps.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ is_approved: true }),
                            });
                            fetchStores();
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/stores/${ps.id}`, { method: "DELETE" });
                            fetchStores();
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                        >
                          Reject
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={addStore} className="card mb-5">
              <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Store
              </h2>
              <div className="flex gap-2 flex-wrap">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Store name" className="input flex-[2] min-w-[150px]" />
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input flex-1 min-w-[120px]">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Address" className="input flex-[2] min-w-[150px]" />
                <button type="submit" className="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-indigo-700 transition-colors">
                  Add
                </button>
              </div>
            </form>

            {storeLoading && <p className="text-slate-500 text-center py-5">Loading...</p>}
            <div className="space-y-2">
              {stores.map((store) => {
                const IconComp = CATEGORY_ICONS[store.category] || Package;
                const orderCount = storeStats[store.name] || 0;
                return (
                  <div key={store.id} className="card flex items-center gap-3 !py-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <IconComp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900">{store.name}</div>
                      {store.address && <div className="text-xs text-slate-500 truncate">{store.address}</div>}
                      <div className="text-xs text-slate-400">{orderCount} orders</div>
                    </div>
                    <button
                      onClick={() => toggleStore(store.id, store.is_active)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        store.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {store.is_active ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={() => deleteStore(store.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button onClick={fetchOrders} className="btn-secondary !w-auto !py-2 !px-4 !text-sm">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <select
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
                className="input !w-auto !py-2 !text-sm min-w-[140px]"
              >
                <option value="">All stores</option>
                {uniqueStoreNames.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input !w-auto !py-2 !text-sm min-w-[130px]"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="picked_up">Picked up</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="input !w-auto !py-2 !text-sm min-w-[120px]"
              >
                <option value="">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
              </select>
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            {ordersLoading && <p className="text-slate-500 text-center py-5">Loading...</p>}
            <div className="text-xs text-slate-400 mb-2">{filteredOrders.length} orders</div>
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <div key={order.id} className={`card flex items-center gap-3 flex-wrap !py-3 ${order.flagged ? "border-l-4 border-red-500" : ""}`}>
                  <span className="font-mono text-sm font-semibold text-slate-700 min-w-[130px]">{order.order_number}</span>
                  {order.flagged && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200">⚠ Flagged</span>
                  )}
                  <span className={`badge badge-${order.status}`}>{order.status}</span>
                  <span className="text-sm text-slate-600 flex-1 min-w-[100px]">{order.store_name}</span>
                  <span className="text-sm text-slate-600">{order.customer_name}</span>
                  <span className="text-sm font-mono text-slate-500" dir="ltr">{order.customer_phone}</span>
                  <span className="text-sm font-semibold text-indigo-600">{formatFee(order.delivery_fee)}</span>
                  <span className="text-xs text-slate-400">{formatTime(order.created_at)}</span>
                  {!["delivered", "cancelled"].includes(order.status) && (
                    adminCancelConfirm === order.id ? (
                      <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={adminCancelReason[order.id] || ""}
                          onChange={(e) => setAdminCancelReason((prev) => ({ ...prev, [order.id]: e.target.value }))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-36"
                        />
                        <button
                          onClick={() => setAdminCancelConfirm(null)}
                          className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Confirm Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAdminCancelConfirm(order.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riders Tab */}
        {tab === "riders" && (
          <div>
            <button onClick={() => { fetchRiders(); fetchRiderStats(); }} className="btn-secondary !w-auto mb-4 !py-2 !px-4 !text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {ridersLoading && <p className="text-slate-500 text-center py-5">Loading...</p>}

            {/* Pending */}
            {pendingRiders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-amber-700 mb-3">Pending Approval ({pendingRiders.length})</h3>
                <div className="space-y-2">
                  {pendingRiders.map((rider) => (
                    <div key={rider.id} className="card border-amber-200 bg-amber-50/50 flex items-center gap-3 !py-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Bike className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-900">{rider.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{rider.phone}</div>
                        <div className="text-xs text-slate-400">{formatTime(rider.created_at)}</div>
                      </div>
                      <button
                        onClick={() => updateRiderStatus(rider.id, "active")}
                        className="flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => updateRiderStatus(rider.id, "rejected")}
                        className="flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved */}
            {approvedRiders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-emerald-700 mb-3">Approved Riders ({approvedRiders.length})</h3>
                <div className="space-y-2">
                  {approvedRiders.map((rider) => {
                    const stats = riderStats[rider.phone];
                    const isEditing = editingRider === rider.id;
                    return (
                      <div key={rider.id} className="card !py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                            <Bike className="w-5 h-5 text-indigo-600" />
                            {rider.is_online && (
                              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="text"
                                  value={editRiderName}
                                  onChange={(e) => setEditRiderName(e.target.value)}
                                  className="input !py-1 !text-sm !w-auto flex-1 min-w-[100px]"
                                  placeholder="Name"
                                />
                                <input
                                  type="text"
                                  value={editRiderPhone}
                                  onChange={(e) => setEditRiderPhone(e.target.value)}
                                  className="input !py-1 !text-sm !w-auto flex-1 min-w-[100px]"
                                  placeholder="Phone"
                                />
                                <button
                                  onClick={() => saveRiderEdit(rider.id)}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingRider(null)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                  {rider.name}
                                  {rider.is_blocked && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">Blocked</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 font-mono">{rider.phone}</div>
                                {stats && (
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    {stats.total_deliveries} deliveries · {formatFee(stats.total_earned)} earned
                                    {stats.last_delivery_at && <> · Last: {formatDate(stats.last_delivery_at)}</>}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                                rider.is_online
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}>
                                {rider.is_online ? "Online" : "Offline"}
                              </span>
                              <button
                                onClick={() => { setEditingRider(rider.id); setEditRiderName(rider.name); setEditRiderPhone(rider.phone); }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleBlockRider(rider.id, !!rider.is_blocked)}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                                  rider.is_blocked
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                                }`}
                              >
                                {rider.is_blocked ? "Unblock" : "Block"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rejected */}
            {rejectedRiders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 mb-3">Rejected ({rejectedRiders.length})</h3>
                <div className="space-y-2">
                  {rejectedRiders.map((rider) => (
                    <div key={rider.id} className="card flex items-center gap-3 !py-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <Bike className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-900">{rider.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{rider.phone}</div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200">
                        Rejected
                      </span>
                      <button
                        onClick={() => updateRiderStatus(rider.id, "active")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Re-approve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {riders.length === 0 && !ridersLoading && (
              <p className="text-slate-500 text-center py-8">No riders registered yet</p>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {tab === "customers" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { fetchCustomers(); fetchCustomerStats(); }} className="btn-secondary !w-auto !py-2 !px-4 !text-sm">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  Total: {customers.length}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="input !pl-10"
              />
            </div>

            {customersLoading && <p className="text-slate-500 text-center py-5">Loading...</p>}
            <div className="space-y-2">
              {customers
                .filter((c) => {
                  if (!customerSearch) return true;
                  const q = customerSearch.toLowerCase();
                  const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
                  return fullName.includes(q) || c.phone.includes(q);
                })
                .map((c) => {
                  const stats = customerStats[c.phone];
                  return (
                    <div key={c.id} className="card !py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
                          <UserCheck className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                            {c.first_name} {c.last_name}
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-600">
                              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                              {c.points || 0} pts
                            </span>
                            {c.is_blocked && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">Blocked</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{c.email}</div>
                          {stats && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {stats.total_orders} orders · {stats.delivered_orders} delivered · {formatFee(stats.total_spent_millimes)} spent
                              {stats.last_order_at && <> · Last: {formatDate(stats.last_order_at)}</>}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-slate-600" dir="ltr">{c.phone}</div>
                          {c.referred_by && (
                            <div className="text-xs text-indigo-600">Referred by: {c.referred_by}</div>
                          )}
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</div>
                            {(c.successful_referrals_count || 0) > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                                {c.successful_referrals_count} referrals
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                        <input
                          type="number"
                          value={pointsDelta[c.email] || ""}
                          onChange={(e) => setPointsDelta((prev) => ({ ...prev, [c.email]: e.target.value }))}
                          placeholder="e.g. 10 or -10"
                          className="input !py-1.5 !text-sm flex-1"
                        />
                        <button
                          onClick={() => addPoints(c.email)}
                          disabled={pointsUpdating === c.email}
                          className="text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                          {pointsUpdating === c.email ? "..." : "+/- pts"}
                        </button>
                        <button
                          onClick={() => toggleBlockCustomer(c.email, !!c.is_blocked)}
                          className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                            c.is_blocked
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {c.is_blocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
            {customers.length === 0 && !customersLoading && (
              <p className="text-slate-500 text-center py-8">No customers registered yet</p>
            )}
          </div>
        )}

        {/* Broadcast Tab */}
        {tab === "broadcast" && (
          <div>
            {/* New broadcast form */}
            <div className="card mb-5">
              <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4" /> New Broadcast
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Message in Arabic</label>
                  <textarea
                    value={broadcastAr}
                    onChange={(e) => setBroadcastAr(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    dir="rtl"
                    placeholder="الرسالة بالعربية..."
                  />
                </div>
                <div>
                  <label className="label">Message in French</label>
                  <textarea
                    value={broadcastFr}
                    onChange={(e) => setBroadcastFr(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    placeholder="Message en français..."
                  />
                </div>
                <div>
                  <label className="label">Message in English</label>
                  <textarea
                    value={broadcastEn}
                    onChange={(e) => setBroadcastEn(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    placeholder="Message in English..."
                  />
                </div>
                <button
                  onClick={sendBroadcast}
                  disabled={broadcastSending || (!broadcastAr.trim() && !broadcastFr.trim() && !broadcastEn.trim())}
                  className="btn-primary"
                >
                  {broadcastSending ? "Sending..." : "Send Broadcast"}
                </button>
              </div>
            </div>

            {/* Current active announcement */}
            {(() => {
              const active = announcements.find((a) => a.is_active);
              return active ? (
                <div className="card border-emerald-200 bg-emerald-50/50 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-emerald-700">Active Announcement</h3>
                    <button
                      onClick={() => toggleAnnouncement(active.id, true)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Deactivate
                    </button>
                  </div>
                  {active.message_ar && <div className="text-sm text-slate-700 mb-1" dir="rtl">🇹🇳 {active.message_ar}</div>}
                  {active.message_fr && <div className="text-sm text-slate-700 mb-1">🇫🇷 {active.message_fr}</div>}
                  {active.message_en && <div className="text-sm text-slate-700">🇬🇧 {active.message_en}</div>}
                  <div className="text-xs text-slate-400 mt-2">{formatDate(active.created_at)} {formatTime(active.created_at)}</div>
                </div>
              ) : (
                <div className="card mb-5 text-center">
                  <p className="text-sm text-slate-400">No active broadcast</p>
                </div>
              );
            })()}

            {/* History */}
            <h3 className="text-sm font-semibold text-slate-900 mb-3">History</h3>
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id} className={`card !py-3 ${a.is_active ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      a.is_active
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {a.is_active ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{formatDate(a.created_at)} {formatTime(a.created_at)}</span>
                      <button
                        onClick={() => toggleAnnouncement(a.id, a.is_active)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          a.is_active
                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {a.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 mt-2">
                    {a.message_ar && <div dir="rtl" className="mb-0.5">{a.message_ar}</div>}
                    {a.message_fr && <div className="mb-0.5">{a.message_fr}</div>}
                    {a.message_en && <div>{a.message_en}</div>}
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-slate-500 text-center py-8">No announcements yet</p>
              )}
            </div>
          </div>
        )}

        {/* Fees Tab */}
        {tab === "fees" && (() => {
          const totalCollected = feePayments.filter(f => f.is_paid).reduce((s, f) => s + f.fee_amount, 0);
          const totalOutstanding = feePayments.filter(f => !f.is_paid).reduce((s, f) => s + f.fee_amount, 0);
          const unpaidRiderPhones = [...new Set(feePayments.filter(f => !f.is_paid).map(f => f.rider_phone))];

          // Group by rider
          const byRider: Record<string, typeof feePayments> = {};
          feePayments.forEach(f => {
            if (!byRider[f.rider_phone]) byRider[f.rider_phone] = [];
            byRider[f.rider_phone].push(f);
          });

          async function markFeePaid(feeId: string) {
            await fetch("/api/rider-fees", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fee_ids: [feeId] }),
            });
            setFeePayments(prev => prev.map(f => f.id === feeId ? { ...f, is_paid: true, paid_at: new Date().toISOString() } : f));
          }

          async function markAllPaidForRider(riderPhone: string) {
            const unpaidIds = feePayments.filter(f => f.rider_phone === riderPhone && !f.is_paid).map(f => f.id);
            if (unpaidIds.length === 0) return;
            await fetch("/api/rider-fees", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fee_ids: unpaidIds }),
            });
            setFeePayments(prev => prev.map(f => unpaidIds.includes(f.id) ? { ...f, is_paid: true, paid_at: new Date().toISOString() } : f));
          }

          return (
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="card text-center">
                <div className="text-xs text-slate-500 mb-1">Total Collected</div>
                <div className="text-lg font-bold text-emerald-600">{formatFee(totalCollected)}</div>
              </div>
              <div className="card text-center">
                <div className="text-xs text-slate-500 mb-1">Outstanding</div>
                <div className="text-lg font-bold text-amber-600">{formatFee(totalOutstanding)}</div>
              </div>
              <div className="card text-center">
                <div className="text-xs text-slate-500 mb-1">Unpaid Riders</div>
                <div className="text-lg font-bold text-red-600">{unpaidRiderPhones.length}</div>
              </div>
            </div>

            {/* Fee breakdown card */}
            <div className="card mb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4" /> Fee Breakdown
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                  <div className="text-xs text-indigo-500 mb-1">Customer Pays</div>
                  <div className="text-lg font-bold text-indigo-600">{formatFee(FLAT_DELIVERY_FEE)}</div>
                  <div className="text-xs text-slate-400">flat per delivery</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <div className="text-xs text-emerald-500 mb-1">Rider Earns</div>
                  <div className="text-lg font-bold text-emerald-600">{formatFee(RIDER_TAKE)}</div>
                  <div className="text-xs text-slate-400">per delivery</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <div className="text-xs text-amber-500 mb-1">Service Fee</div>
                  <div className="text-lg font-bold text-amber-600">{formatFee(FEE_PER_DELIVERY)}</div>
                  <div className="text-xs text-slate-400">rider pays weekly</div>
                </div>
              </div>
            </div>

            {/* Per-rider fee details */}
            {Object.entries(byRider).sort().map(([phone, fees]) => {
              const rider = approvedRiders.find(r => r.phone === phone);
              const riderName = rider?.name || phone;
              const unpaid = fees.filter(f => !f.is_paid);
              const totalOwed = unpaid.reduce((s, f) => s + f.fee_amount, 0);
              return (
              <div key={phone} className="card mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-900">{riderName}</div>
                    <div className="text-xs text-slate-400 font-mono" dir="ltr">{phone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-600">{formatFee(totalOwed)} owed</span>
                    {unpaid.length > 0 && (
                      <button
                        onClick={() => markAllPaidForRider(phone)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                        Mark All Paid
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-1.5 px-2 text-slate-500 font-medium">Order</th>
                        <th className="text-left py-1.5 px-2 text-slate-500 font-medium">Store</th>
                        <th className="text-left py-1.5 px-2 text-slate-500 font-medium">Date</th>
                        <th className="text-right py-1.5 px-2 text-slate-500 font-medium">Fee</th>
                        <th className="text-center py-1.5 px-2 text-slate-500 font-medium">Status</th>
                        <th className="text-right py-1.5 px-2 text-slate-500 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((f) => (
                        <tr key={f.id} className={`border-b border-slate-50 ${f.is_paid ? "opacity-60" : ""}`}>
                          <td className="py-2 px-2 font-mono text-slate-600">{f.order_number || "—"}</td>
                          <td className="py-2 px-2 text-slate-600">{f.store_name || "—"}</td>
                          <td className="py-2 px-2 text-slate-500">{new Date(f.created_at).toLocaleDateString()}</td>
                          <td className="py-2 px-2 text-right font-semibold">{formatFee(f.fee_amount)}</td>
                          <td className="py-2 px-2 text-center">
                            {f.is_paid ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                Unpaid
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {!f.is_paid && (
                              <button
                                onClick={() => markFeePaid(f.id)}
                                className="text-xs px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })}

            {feePayments.length === 0 && (
              <div className="card text-center text-slate-400 py-8">No fee payments recorded yet. Fees are created automatically when orders are delivered.</div>
            )}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
