"use client";

import { useState, useEffect, useCallback } from "react";

interface Store {
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

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: "🍽️",
  supermarket: "🛒",
  pharmacy: "💊",
  bakery: "🥖",
  grocery: "🥦",
  shop: "🏪",
  other: "📦",
};

const CATEGORIES = ["restaurant", "supermarket", "pharmacy", "bakery", "grocery", "shop", "other"];

function formatFee(m: number) {
  return `${(m / 1000).toFixed(3)} DT`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  picked_up: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const RIDER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef3c7", text: "#92400e" },
  active: { bg: "#d1fae5", text: "#065f46" },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"stores" | "orders" | "riders">("stores");

  // Stores state
  const [stores, setStores] = useState<Store[]>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("restaurant");
  const [newAddress, setNewAddress] = useState("");
  const [storeLoading, setStoreLoading] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Riders state
  const [riders, setRiders] = useState<Rider[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("adminAuth");
    if (saved === "tawsil2024admin") setAuthed(true);
  }, []);

  const fetchStores = useCallback(async () => {
    setStoreLoading(true);
    try {
      const res = await fetch("/api/admin/stores");
      const data = await res.json();
      setStores(data.stores || []);
    } finally {
      setStoreLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const fetchRiders = useCallback(async () => {
    setRidersLoading(true);
    try {
      const res = await fetch("/api/admin/riders");
      const data = await res.json();
      setRiders(data.riders || []);
    } finally {
      setRidersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      fetchStores();
      fetchOrders();
      fetchRiders();
    }
  }, [authed, fetchStores, fetchOrders, fetchRiders]);

  function login() {
    if (password === "tawsil2024admin") {
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

  if (!authed) {
    return (
      <div dir="ltr" style={{ maxWidth: 400, margin: "80px auto", padding: 20, textAlign: "left" }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>Admin Login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="Password"
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 12, marginBottom: 12, fontSize: 14 }}
        />
        <button
          onClick={login}
          style={{ width: "100%", padding: "10px 14px", backgroundColor: "#f59e0b", color: "#78350f", fontWeight: 600, borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14 }}
        >
          Login
        </button>
      </div>
    );
  }

  const pendingRiders = riders.filter(r => r.status === "pending");
  const approvedRiders = riders.filter(r => r.status === "active");
  const rejectedRiders = riders.filter(r => r.status === "rejected");

  return (
    <div dir="ltr" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px", textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold" }}>Tawsil Admin</h1>
        <button
          onClick={() => { localStorage.removeItem("adminAuth"); setAuthed(false); }}
          style={{ fontSize: 13, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["stores", "orders", "riders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              backgroundColor: tab === t ? "#f59e0b" : "#f3f4f6",
              color: tab === t ? "#78350f" : "#6b7280",
              position: "relative",
            }}
          >
            {t === "stores" ? "Stores" : t === "orders" ? "Orders" : "Riders"}
            {t === "riders" && pendingRiders.length > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "#ef4444", color: "white", borderRadius: "50%",
                width: 20, height: 20, fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{pendingRiders.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Stores Tab */}
      {tab === "stores" && (
        <div>
          <form onSubmit={addStore} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Add Store</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Store name"
                style={{ flex: 2, minWidth: 150, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14 }}
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ flex: 1, minWidth: 120, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14 }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                ))}
              </select>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Address"
                style={{ flex: 2, minWidth: 150, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14 }}
              />
              <button
                type="submit"
                style={{ padding: "8px 20px", backgroundColor: "#f59e0b", color: "#78350f", fontWeight: 600, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14 }}
              >
                Add
              </button>
            </div>
          </form>

          {storeLoading && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Loading...</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stores.map((store) => (
              <div key={store.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{CATEGORY_ICONS[store.category] || "📦"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{store.name}</div>
                  {store.address && <div style={{ fontSize: 12, color: "#6b7280" }}>{store.address}</div>}
                </div>
                <button
                  onClick={() => toggleStore(store.id, store.is_active)}
                  style={{
                    padding: "4px 12px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", fontSize: 12, fontWeight: 500,
                    backgroundColor: store.is_active ? "#d1fae5" : "#fee2e2",
                    color: store.is_active ? "#065f46" : "#991b1b",
                  }}
                >
                  {store.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => deleteStore(store.id)}
                  style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid #fca5a5", backgroundColor: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 500 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div>
          <button
            onClick={fetchOrders}
            style={{ marginBottom: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", fontSize: 13, backgroundColor: "#f9fafb" }}
          >
            Refresh
          </button>
          {ordersLoading && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Loading...</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {orders.map((order) => (
              <div key={order.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 600, fontSize: 13, fontFamily: "monospace", minWidth: 130 }}>{order.order_number}</div>
                <span
                  style={{ padding: "2px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600 }}
                  className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}
                >
                  {order.status}
                </span>
                <div style={{ flex: 1, minWidth: 100, fontSize: 13 }}>{order.store_name}</div>
                <div style={{ fontSize: 13 }}>{order.customer_name}</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", direction: "ltr" }}>{order.customer_phone}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#d97706" }}>{formatFee(order.delivery_fee)}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{formatTime(order.created_at)}</div>
                {(order.status === "pending" || order.status === "accepted") && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid #fca5a5", backgroundColor: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 500 }}
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
          <button
            onClick={fetchRiders}
            style={{ marginBottom: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", fontSize: 13, backgroundColor: "#f9fafb" }}
          >
            Refresh
          </button>
          {ridersLoading && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Loading...</p>}

          {/* Pending riders */}
          {pendingRiders.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#92400e" }}>Pending Approval ({pendingRiders.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pendingRiders.map((rider) => (
                  <div key={rider.id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>🛵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{rider.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{rider.phone}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{formatTime(rider.created_at)}</div>
                    </div>
                    <button
                      onClick={() => updateRiderStatus(rider.id, "active")}
                      style={{ padding: "6px 16px", borderRadius: 8, border: "none", backgroundColor: "#10b981", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateRiderStatus(rider.id, "rejected")}
                      style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #fca5a5", backgroundColor: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved riders */}
          {approvedRiders.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#065f46" }}>Approved Riders ({approvedRiders.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {approvedRiders.map((rider) => (
                  <div key={rider.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>🛵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{rider.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{rider.phone}</div>
                    </div>
                    <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, backgroundColor: RIDER_STATUS_COLORS.active.bg, color: RIDER_STATUS_COLORS.active.text }}>
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected riders */}
          {rejectedRiders.length > 0 && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#991b1b" }}>Rejected ({rejectedRiders.length})</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rejectedRiders.map((rider) => (
                  <div key={rider.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24 }}>🛵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{rider.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{rider.phone}</div>
                    </div>
                    <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, backgroundColor: RIDER_STATUS_COLORS.rejected.bg, color: RIDER_STATUS_COLORS.rejected.text }}>
                      Rejected
                    </span>
                    <button
                      onClick={() => updateRiderStatus(rider.id, "active")}
                      style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid #d1d5db", backgroundColor: "#f9fafb", color: "#374151", cursor: "pointer", fontSize: 12, fontWeight: 500 }}
                    >
                      Re-approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {riders.length === 0 && !ridersLoading && (
            <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>No riders registered yet</p>
          )}
        </div>
      )}
    </div>
  );
}
