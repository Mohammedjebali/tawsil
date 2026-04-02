"use client";

import { useState, useEffect, useCallback } from "react";
import { Store, Package, Users, Plus, Trash2, RefreshCw, XCircle, CheckCircle2, ShoppingCart, Coffee, Pill, UtensilsCrossed, Bike, UserCheck, Search } from "lucide-react";

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
  created_at: string;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  status: string;
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

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"stores" | "orders" | "riders" | "customers">("stores");

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("restaurant");
  const [newAddress, setNewAddress] = useState("");
  const [storeLoading, setStoreLoading] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [riders, setRiders] = useState<Rider[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);

  const [customers, setCustomers] = useState<{ id: string; first_name: string; last_name: string; email: string; phone: string; created_at: string }[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("adminAuth");
    if (saved === "zerba-321") setAuthed(true);
  }, []);

  const fetchStores = useCallback(async () => {
    setStoreLoading(true);
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json();
      setStores(data.stores || []);
    } finally { setStoreLoading(false); }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } finally { setOrdersLoading(false); }
  }, []);

  const fetchRiders = useCallback(async () => {
    setRidersLoading(true);
    try {
      const res = await fetch("/api/admin/riders");
      const data = await res.json();
      setRiders(data.riders || []);
    } finally { setRidersLoading(false); }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } finally { setCustomersLoading(false); }
  }, []);

  useEffect(() => {
    if (authed) { fetchStores(); fetchOrders(); fetchRiders(); fetchCustomers(); }
  }, [authed, fetchStores, fetchOrders, fetchRiders, fetchCustomers]);

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

  async function cancelOrder(id: string) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    fetchOrders();
  }

  async function updateRiderStatus(id: string, status: "active" | "rejected") {
    await fetch(`/api/admin/riders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchRiders();
  }

  // Login screen
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
    { key: "stores" as const, label: "Stores", icon: Store },
    { key: "orders" as const, label: "Orders", icon: Package },
    { key: "riders" as const, label: "Riders", icon: Users, badge: pendingRiders.length },
    { key: "customers" as const, label: "Customers", icon: UserCheck },
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
                    ? "bg-blue-700 text-white shadow-sm"
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

        {/* Stores Tab */}
        {tab === "stores" && (
          <div>
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
                <button type="submit" className="bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-800 transition-colors">
                  Add
                </button>
              </div>
            </form>

            {storeLoading && <p className="text-slate-500 text-center py-5">Loading...</p>}
            <div className="space-y-2">
              {stores.map((store) => {
                const IconComp = CATEGORY_ICONS[store.category] || Package;
                return (
                  <div key={store.id} className="card flex items-center gap-3 !py-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <IconComp className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900">{store.name}</div>
                      {store.address && <div className="text-xs text-slate-500 truncate">{store.address}</div>}
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
            <button onClick={fetchOrders} className="btn-secondary !w-auto mb-4 !py-2 !px-4 !text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {ordersLoading && <p className="text-slate-500 text-center py-5">Loading...</p>}
            <div className="space-y-2">
              {orders.map((order) => (
                <div key={order.id} className="card flex items-center gap-3 flex-wrap !py-3">
                  <span className="font-mono text-sm font-semibold text-slate-700 min-w-[130px]">{order.order_number}</span>
                  <span className={`badge badge-${order.status}`}>{order.status}</span>
                  <span className="text-sm text-slate-600 flex-1 min-w-[100px]">{order.store_name}</span>
                  <span className="text-sm text-slate-600">{order.customer_name}</span>
                  <span className="text-sm font-mono text-slate-500" dir="ltr">{order.customer_phone}</span>
                  <span className="text-sm font-semibold text-blue-700">{formatFee(order.delivery_fee)}</span>
                  <span className="text-xs text-slate-400">{formatTime(order.created_at)}</span>
                  {(order.status === "pending" || order.status === "accepted") && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riders Tab */}
        {tab === "riders" && (
          <div>
            <button onClick={fetchRiders} className="btn-secondary !w-auto mb-4 !py-2 !px-4 !text-sm">
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
                  {approvedRiders.map((rider) => (
                    <div key={rider.id} className="card flex items-center gap-3 !py-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                        <Bike className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-900">{rider.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{rider.phone}</div>
                      </div>
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </div>
                  ))}
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
                <button onClick={fetchCustomers} className="btn-secondary !w-auto !py-2 !px-4 !text-sm">
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
                .map((c) => (
                  <div key={c.id} className="card flex items-center gap-3 !py-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900">{c.first_name} {c.last_name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-slate-600" dir="ltr">{c.phone}</div>
                      <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
            </div>
            {customers.length === 0 && !customersLoading && (
              <p className="text-slate-500 text-center py-8">No customers registered yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
