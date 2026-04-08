"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, ArrowRight, Plus, Minus, ShoppingCart, X, Star, Clock, MapPin, Phone, Trash2, Store as StoreIcon } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import Link from "next/link";
import { formatFee } from "@/lib/fees";

interface StoreData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number;
  delivery_fee: number;
  opening_time: string | null;
  closing_time: string | null;
}

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface MenuItem {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

interface CartItem {
  item: MenuItem;
  qty: number;
}

export default function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, isRtl, lang } = useLang();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const [store, setStore] = useState<StoreData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "granted" | "error">("idle");

  useEffect(() => {
    const savedAddr = localStorage.getItem("tawsil_saved_address");
    const savedLat = localStorage.getItem("tawsil_lat");
    const savedLng = localStorage.getItem("tawsil_lng");
    if (savedAddr) setCustomerAddress(savedAddr);
    if (savedLat) setCustomerLat(parseFloat(savedLat));
    if (savedLng) setCustomerLng(parseFloat(savedLng));
  }, []);

  async function fetchStore(silent = false) {
    try {
      const res = await fetch(`/api/stores/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStore(data.store);
      setCategories(data.categories || []);
      setItems(data.items || []);
    } catch {
      if (!silent) setError("Failed to load store");
    }
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    fetchStore();
    const interval = setInterval(() => fetchStore(true), 30000);
    return () => clearInterval(interval);
  }, [id]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { item, qty: 1 }];
    });
  }

  function updateQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  async function placeOrder() {
    if (!store || cart.length === 0) return;
    const savedUser = localStorage.getItem("tawsil_user");
    if (!savedUser) {
      setError(t("loginRequired"));
      return;
    }

    if (!customerAddress.trim()) {
      setError(t("addressRequired") || "Delivery address is required");
      return;
    }

    setOrdering(true);
    setError("");

    try {
      const user = JSON.parse(savedUser);

      // Save address + GPS to localStorage
      localStorage.setItem("tawsil_saved_address", customerAddress);
      if (customerLat !== null) localStorage.setItem("tawsil_lat", String(customerLat));
      if (customerLng !== null) localStorage.setItem("tawsil_lng", String(customerLng));

      const itemsDesc = cart.map((c) => `${c.qty}x ${c.item.name}`).join(", ");
      const customerName = user.name || user.firstName || user.email || "Customer";
      const customerPhone = user.phone || "";
      if (!customerPhone) {
        setError("Phone number is required. Please complete your profile.");
        setOrdering(false);
        return;
      }

      // 1. Create order in main orders table
      let orderRes: Response;
      try {
        orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            customer_lat: customerLat,
            customer_lng: customerLng,
            store_id: store.id,
            store_name: store.name,
            store_address: store.address || "",
            store_lat: store.lat || null,
            store_lng: store.lng || null,
            items_description: itemsDesc,
            estimated_amount: cartTotal / 1000,
            user_id: user.user_id || null,
          }),
        });
      } catch {
        throw new Error("Network error — check your connection and try again");
      }
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order failed");

      setOrderSuccess(orderData.order.order_number);
      setCart([]);
      setShowCart(false);
    } catch (err) {
      setError(String(err));
    }
    setOrdering(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-100 rounded-xl" />
          <div className="h-8 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t("orderPlaced")}</h2>
        <p className="text-slate-500 mb-2">{t("orderNumber")}</p>
        <p className="text-xl font-mono font-bold text-indigo-600 mb-6">{orderSuccess}</p>
        <p className="text-sm text-slate-500 mb-6">{t("riderWillContact")}</p>
        <div className="space-y-3">
          <Link href={`/track?order=${orderSuccess}`} className="btn-primary block text-center no-underline">
            {t("trackOrder")}
          </Link>
          <Link href="/stores" className="btn-secondary block text-center no-underline">
            {t("browseStores")}
          </Link>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">{error || "Store not found"}</p>
      </div>
    );
  }

  // Group items by category
  const grouped: Record<string, MenuItem[]> = {};
  const uncatKey = "__uncategorized";
  for (const item of items) {
    const key = item.category_id || uncatKey;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  const categoryOrder = [...categories.map((c) => c.id)];
  if (grouped[uncatKey]) categoryOrder.push(uncatKey);

  const filteredCategories = activeCategory
    ? categoryOrder.filter((id) => id === activeCategory)
    : categoryOrder;

  return (
    <div className="max-w-2xl mx-auto pb-32" dir={isRtl ? "rtl" : "ltr"}>
      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-slate-100 flex items-center justify-center overflow-hidden">
        {store.cover_url ? (
          <img src={store.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <StoreIcon className="w-16 h-16 text-indigo-200" />
        )}
        <Link
          href="/stores"
          className="absolute top-4 left-4 w-9 h-9 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow"
        >
          <BackArrow className="w-5 h-5 text-slate-700" />
        </Link>
      </div>

      {/* Store info */}
      <div className="px-4 -mt-6 relative">
        <div className="card">
          <div className="flex items-start gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center border-2 border-white shadow">
                <StoreIcon className="w-8 h-8 text-indigo-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">{store.name}</h1>
              <p className="text-sm text-slate-500 capitalize">{t(store.category)}</p>
              {store.description && <p className="text-sm text-slate-600 mt-1">{store.description}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
            {store.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {store.rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {formatFee(store.delivery_fee)} {t("dt")}
            </span>
            {store.opening_time && store.closing_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {store.opening_time.slice(0, 5)} - {store.closing_time.slice(0, 5)}
              </span>
            )}
            {store.phone && (
              <a href={`tel:${store.phone}`} className="flex items-center gap-1 text-indigo-600 no-underline">
                <Phone className="w-3.5 h-3.5" />
                {store.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                !activeCategory ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {t("allCategories")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  activeCategory === cat.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu items */}
      <div className="px-4 mt-4 space-y-6">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p>{t("noMenuItems")}</p>
          </div>
        ) : (
          filteredCategories.map((catId) => {
            const catItems = grouped[catId];
            if (!catItems?.length) return null;
            const catName =
              catId === uncatKey
                ? t("uncategorized")
                : categories.find((c) => c.id === catId)?.name || "";

            return (
              <div key={catId}>
                <h3 className="text-lg font-bold text-slate-800 mb-3">{catName}</h3>
                <div className="space-y-3">
                  {catItems.map((item) => {
                    const inCart = cart.find((c) => c.item.id === item.id);
                    return (
                      <div key={item.id} className="card flex gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-slate-50 flex items-center justify-center">
                            <StoreIcon className="w-8 h-8 text-slate-200" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-indigo-600 text-sm">
                              {(item.price / 1000).toFixed(3)} {t("dt")}
                            </span>
                            {inCart ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-bold w-5 text-center">{inCart.qty}</span>
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full"
                              >
                                {t("addToCart")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart floating bar */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full max-w-2xl mx-auto flex items-center justify-between bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-lg"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-bold">{t("cart")} ({cartCount})</span>
            </span>
            <span className="font-bold">{(cartTotal / 1000).toFixed(3)} {t("dt")}</span>
          </button>
        </div>
      )}

      {/* Cart sheet */}
      {showCart && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold">{t("cart")}</h3>
              <button onClick={() => setShowCart(false)}>
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {cart.map((c) => (
                <div key={c.item.id} className="flex items-center gap-3 py-2 border-b border-slate-100">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{c.item.name}</p>
                    <p className="text-xs text-slate-500">{(c.item.price / 1000).toFixed(3)} {t("dt")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(c.item.id, -1)}
                      className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"
                    >
                      {c.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-4 h-4" />}
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{c.qty}</span>
                    <button
                      onClick={() => updateQty(c.item.id, 1)}
                      className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm font-bold w-20 text-end">
                    {((c.item.price * c.qty) / 1000).toFixed(3)} {t("dt")}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t("subtotal")}</span>
                <span className="font-bold">{(cartTotal / 1000).toFixed(3)} {t("dt")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{t("deliveryFee")}</span>
                <span className="font-bold">{store ? formatFee(store.delivery_fee) : "-"} {t("dt")}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>{t("total")}</span>
                <span className="text-indigo-600">
                  {store ? ((cartTotal + store.delivery_fee) / 1000).toFixed(3) : "-"} {t("dt")}
                </span>
              </div>
              {/* GPS button */}
              <button
                type="button"
                onClick={() => {
                  setGpsStatus("loading");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setCustomerLat(pos.coords.latitude);
                      setCustomerLng(pos.coords.longitude);
                      setGpsStatus("granted");
                    },
                    () => setGpsStatus("error"),
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                  );
                }}
                disabled={gpsStatus === "loading"}
                className={`w-full py-3 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${
                  gpsStatus === "granted"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                <MapPin className="w-4 h-4" />
                {gpsStatus === "loading"
                  ? t("locating")
                  : gpsStatus === "granted"
                  ? t("locationGranted")
                  : t("useMyLocation")}
              </button>
              {gpsStatus === "error" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-amber-700 text-xs font-medium">{t("locationError")}</p>
                  <p className="text-amber-600 text-xs mt-1">{t("locationErrorFallback")}</p>
                </div>
              )}

              {/* Delivery address */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  {t("address")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  rows={2}
                  className="input resize-none"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={placeOrder}
                disabled={ordering || !customerAddress.trim()}
                className="btn-primary w-full"
                style={{ opacity: ordering || !customerAddress.trim() ? 0.6 : 1 }}
              >
                {ordering ? t("submitting") : t("placeOrder")}
              </button>
              <p className="text-xs text-center text-slate-400">{t("cashOnDelivery")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
