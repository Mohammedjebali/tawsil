"use client";

import { useState, useEffect } from "react";
import { formatFee, calculateDeliveryFee, getDistanceKm } from "@/lib/fees";

interface Store {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

interface UserProfile {
  name: string;
  phone: string;
  role: string;
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

function LandingPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <span className="text-5xl">🛵</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Tawsil</h1>
          <p className="text-gray-500 text-sm">منزل النور</p>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          <a
            href="/register/customer"
            className="card flex items-center gap-4 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all group no-underline"
          >
            <div className="w-16 h-16 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-center text-3xl">
              🛒
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-white">أنا زبون</div>
              <div className="text-sm text-gray-500">أريد الطلب</div>
            </div>
            <span className="text-gray-600 group-hover:text-red-400 transition-colors text-xl">←</span>
          </a>

          <a
            href="/register/rider"
            className="card flex items-center gap-4 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)] transition-all group no-underline"
          >
            <div className="w-16 h-16 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center justify-center text-3xl">
              🛵
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-white">أنا راكب</div>
              <div className="text-sm text-gray-500">أريد التوصيل</div>
            </div>
            <span className="text-gray-600 group-hover:text-red-400 transition-colors text-xl">←</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [step, setStep] = useState<"store" | "details" | "confirm" | "success">("store");

  // Form state
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [customStore, setCustomStore] = useState("");
  const [items, setItems] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{ order_number: string; delivery_fee: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.role === "customer") {
        setUser(parsed);
      } else if (parsed.role === "rider") {
        window.location.href = "/rider";
        return;
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (user) {
      fetch("/api/stores")
        .then((r) => r.json())
        .then((d) => setStores(d.stores || []));
    }
  }, [user]);

  async function submitOrder() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const sName = selectedStore ? selectedStore.name : customStore;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: user.name,
          customer_phone: user.phone,
          customer_address: customerAddress,
          customer_lat: customerLat,
          customer_lng: customerLng,
          store_id: selectedStore?.id || null,
          store_name: sName,
          store_address: selectedStore?.address || null,
          store_lat: selectedStore?.lat || null,
          store_lng: selectedStore?.lng || null,
          items_description: items,
          estimated_amount: estimatedAmount ? parseFloat(estimatedAmount) : null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOrderResult({ order_number: data.order.order_number, delivery_fee: data.order.delivery_fee });
      setStep("success");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  // No profile — show landing
  if (!user) return <LandingPage />;

  const storeName = selectedStore ? selectedStore.name : customStore;

  return (
    <div>
      {/* Step: Pick store */}
      {step === "store" && (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">اختر المحل</h1>
            <p className="text-gray-500 text-sm">من وين تحب تطلب؟</p>
          </div>

          {/* Store list */}
          <div className="space-y-2.5 mb-4">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => { setSelectedStore(store); setCustomStore(""); setStep("details"); }}
                className="w-full card flex items-center gap-3 text-right hover:border-red-500/40 hover:shadow-[0_0_12px_rgba(239,68,68,0.08)] transition-all group"
              >
                <span className="text-3xl">{CATEGORY_ICONS[store.category] || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white">{store.name}</div>
                  {store.address && <div className="text-xs text-gray-500 truncate">{store.address}</div>}
                </div>
                <span className="text-gray-600 group-hover:text-red-400 transition-colors">←</span>
              </button>
            ))}
          </div>

          <div className="relative my-5">
            <div className="border-t border-[#1e2535]" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#0d1117] px-3 text-xs text-gray-600">أو</span>
          </div>

          {/* Custom store */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-400 mb-2">محل آخر؟ اكتب اسمه</label>
            <input
              type="text"
              value={customStore}
              onChange={(e) => { setCustomStore(e.target.value); setSelectedStore(null); }}
              placeholder="مثال: عطار الحاج محمد"
              className="input"
            />
            {customStore.trim() && (
              <button
                onClick={() => setStep("details")}
                className="btn-primary mt-3"
              >
                متابعة ←
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step: Order details */}
      {step === "details" && (
        <div>
          <button onClick={() => setStep("store")} className="text-red-400 text-sm mb-4 flex items-center gap-1 hover:text-red-300 transition-colors">
            → رجوع
          </button>

          {/* Store pill */}
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="text-sm">{selectedStore ? CATEGORY_ICONS[selectedStore.category] || "📦" : "📍"}</span>
            <span className="text-sm text-red-400">من: <span className="font-bold text-white">{storeName}</span></span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">وش تحب تطلب؟</h2>
          </div>

          <div className="space-y-4">
            <div>
              <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder={"مثال: قهوة كبيرة بحليب، كيك شوكولا...\n- 1 كيلو بطاطا\n- زيت زيتون 1 لتر"}
                rows={5}
                className="input resize-none !text-right"
                style={{ minHeight: "120px" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                تقدير سعر البضاعة (اختياري)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  placeholder="0.000"
                  className="input pr-4"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">DT</span>
              </div>
              <p className="text-xs text-gray-600 mt-1.5">يساعد الراكب على تحضير المبلغ</p>
            </div>
          </div>

          <button
            onClick={() => setStep("confirm")}
            disabled={!items.trim()}
            className="btn-primary mt-5"
          >
            متابعة ←
          </button>
        </div>
      )}

      {/* Step: Address + confirm */}
      {step === "confirm" && (
        <div>
          <button onClick={() => setStep("details")} className="text-red-400 text-sm mb-4 flex items-center gap-1 hover:text-red-300 transition-colors">
            → رجوع
          </button>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-white mb-1">عنوان التوصيل</h2>
          </div>

          <div className="space-y-4 mb-4">
            <div>
              <button
                type="button"
                onClick={() => {
                  setGpsStatus("loading");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setCustomerLat(pos.coords.latitude);
                      setCustomerLng(pos.coords.longitude);
                      setCustomerAddress("موقعي الحالي 📍");
                      setGpsStatus("done");
                    },
                    () => setGpsStatus("error"),
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
                disabled={gpsStatus === "loading"}
                className={`w-full mb-3 py-3 rounded-xl text-sm font-medium border transition-all ${
                  gpsStatus === "done"
                    ? "border-green-500/40 bg-green-500/10 text-green-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15"
                }`}
              >
                {gpsStatus === "loading"
                  ? "جاري تحديد الموقع..."
                  : gpsStatus === "done"
                  ? "✅ تم تحديد موقعك"
                  : "📍 استخدام موقعي"}
              </button>
              {gpsStatus === "error" && <p className="text-red-400 text-xs mb-2">تعذر تحديد الموقع، أدخل العنوان يدوياً</p>}
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                عنوانك <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="الشارع / الحي / أقرب معلم"
                className="input"
              />
            </div>
          </div>

          {/* Fee preview card */}
          <div className="card-active mb-4">
            <div className="text-sm font-bold text-white mb-3">💰 تفاصيل الدفع</div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>سعر البضاعة</span>
              <span className="text-gray-300">{estimatedAmount ? `~${estimatedAmount} DT` : "يُحدد عند الشراء"}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>رسوم التوصيل {customerLat ? "" : "(تُحسب حسب المسافة)"}</span>
              <span className="text-red-400 font-bold">
                {customerLat && customerLng
                  ? formatFee(calculateDeliveryFee(getDistanceKm(
                      selectedStore?.lat ?? 36.5333, selectedStore?.lng ?? 10.5167,
                      customerLat, customerLng
                    )))
                  : `من ${formatFee(2000)}`}
              </span>
            </div>
            <div className="border-t border-[#2a3347] mt-3 pt-3 text-xs text-gray-500">
              الدفع نقداً عند الاستلام 💵
            </div>
          </div>

          {error && <div className="card border-red-500/30 text-red-400 text-sm mb-3">{error}</div>}

          <button
            onClick={submitOrder}
            disabled={loading || !customerAddress}
            className="btn-primary"
          >
            {loading ? "جاري الإرسال..." : "تأكيد الطلب"}
          </button>
        </div>
      )}

      {/* Step: Success */}
      {step === "success" && orderResult && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-500/15 border-2 border-green-500/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">تم استقبال طلبك!</h1>
          <p className="text-gray-500 mb-6">سيتصل بك الراكب قريباً</p>

          <div className="card-active mb-5 text-right">
            <div className="text-sm text-gray-500 mb-1">رقم طلبك</div>
            <div className="text-2xl font-bold text-red-400" dir="ltr">{orderResult.order_number}</div>
            <div className="text-xs text-gray-600 mt-1">احتفظ بهذا الرقم لتتبع طلبك</div>
          </div>

          <div className="card text-right mb-5">
            <div className="text-sm font-bold text-white mb-3">ملخص الطلب</div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>المحل</span><span className="font-medium text-white">{storeName}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>رسوم التوصيل</span><span className="font-bold text-red-400">{formatFee(orderResult.delivery_fee)}</span>
            </div>
          </div>

          <a href={`/track?order=${orderResult.order_number}`} className="btn-primary block text-center no-underline">
            🔍 تتبع طلبي
          </a>
          <button
            onClick={() => { setStep("store"); setOrderResult(null); setItems(""); setCustomStore(""); setSelectedStore(null); setCustomerAddress(""); setEstimatedAmount(""); setCustomerLat(null); setCustomerLng(null); setGpsStatus("idle"); }}
            className="btn-secondary mt-3"
          >
            طلب جديد
          </button>
        </div>
      )}
    </div>
  );
}
