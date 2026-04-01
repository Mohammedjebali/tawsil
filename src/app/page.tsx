"use client";

import { useState, useEffect } from "react";
import { formatFee } from "@/lib/fees";

interface Store {
  id: string;
  name: string;
  category: string;
  address: string | null;
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

export default function OrderPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [step, setStep] = useState<"store" | "details" | "confirm" | "success">("store");

  // Form state
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [customStore, setCustomStore] = useState("");
  const [items, setItems] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<{ order_number: string; delivery_fee: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => setStores(d.stores || []));
  }, []);

  async function submitOrder() {
    setLoading(true);
    setError(null);
    try {
      const storeName = selectedStore ? selectedStore.name : customStore;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          store_id: selectedStore?.id || null,
          store_name: storeName,
          store_address: selectedStore?.address || null,
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

  const storeName = selectedStore ? selectedStore.name : customStore;

  return (
    <div>
      {/* Step: Pick store */}
      {step === "store" && (
        <div>
          <div className="mb-5">
            <h1 className="text-2xl font-bold mb-1">🛵 اطلب توصيل</h1>
            <p className="text-gray-500 text-sm">اختر المحل أو اكتب اسمه</p>
          </div>

          {/* Store list */}
          <div className="space-y-2 mb-4">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => { setSelectedStore(store); setCustomStore(""); setStep("details"); }}
                className="w-full card flex items-center gap-3 text-right hover:border-amber-300 hover:shadow-md transition-all"
              >
                <span className="text-2xl">{CATEGORY_ICONS[store.category] || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{store.name}</div>
                  {store.address && <div className="text-xs text-gray-500 truncate">{store.address}</div>}
                </div>
                <span className="text-gray-400">←</span>
              </button>
            ))}
          </div>

          <div className="relative my-4">
            <div className="border-t border-gray-200" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-gray-50 px-2 text-xs text-gray-500">أو</span>
          </div>

          {/* Custom store */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 mb-2">محل آخر؟ اكتب اسمه</label>
            <input
              type="text"
              value={customStore}
              onChange={(e) => { setCustomStore(e.target.value); setSelectedStore(null); }}
              placeholder="مثال: عطار الحاج محمد"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
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
          <button onClick={() => setStep("store")} className="text-amber-600 text-sm mb-4 flex items-center gap-1">
            → رجوع
          </button>

          <div className="card mb-3 flex items-center gap-3">
            <span className="text-2xl">{selectedStore ? CATEGORY_ICONS[selectedStore.category] || "📦" : "📍"}</span>
            <div>
              <div className="text-xs text-gray-500">الطلب من</div>
              <div className="font-bold">{storeName}</div>
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                ماذا تريد؟ <span className="text-red-500">*</span>
              </label>
              <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder="اكتب بالتفصيل ما تريد طلبه مثلاً:&#10;- 1 كيلو بطاطا&#10;- زيت زيتون 1 لتر&#10;- خبز 2 حبة"
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                تقدير سعر البضاعة (اختياري)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  placeholder="0.000"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 pr-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">DT</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">يساعد الراكب على تحضير المبلغ</p>
            </div>
          </div>

          <button
            onClick={() => setStep("confirm")}
            disabled={!items.trim()}
            className="btn-primary mt-4"
          >
            متابعة ←
          </button>
        </div>
      )}

      {/* Step: Customer info + confirm */}
      {step === "confirm" && (
        <div>
          <button onClick={() => setStep("details")} className="text-amber-600 text-sm mb-4 flex items-center gap-1">
            → رجوع
          </button>

          <div className="card space-y-4 mb-4">
            <h2 className="font-bold text-gray-800">معلوماتك</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                الاسم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسمك الكامل"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="2X XXX XXX"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                عنوانك <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="الشارع / الحي / أقرب معلم"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Fee info */}
          <div className="card bg-amber-50 border-amber-200 mb-4">
            <div className="text-sm font-semibold text-amber-800 mb-2">💰 تفاصيل الدفع</div>
            <div className="flex justify-between text-sm text-amber-700">
              <span>سعر البضاعة</span>
              <span>{estimatedAmount ? `~${estimatedAmount} DT` : "يُحدد عند الشراء"}</span>
            </div>
            <div className="flex justify-between text-sm text-amber-700 mt-1">
              <span>رسوم التوصيل (تُحسب حسب المسافة)</span>
              <span>من {formatFee(2000)}</span>
            </div>
            <div className="border-t border-amber-200 mt-2 pt-2 text-xs text-amber-600">
              الدفع نقداً عند الاستلام 💵
            </div>
          </div>

          {error && <div className="card bg-red-50 border-red-200 text-red-700 text-sm mb-3">{error}</div>}

          <button
            onClick={submitOrder}
            disabled={loading || !customerName || !customerPhone || !customerAddress}
            className="btn-primary"
          >
            {loading ? "جاري الإرسال..." : "✅ تأكيد الطلب"}
          </button>
        </div>
      )}

      {/* Step: Success */}
      {step === "success" && orderResult && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">تم استقبال طلبك!</h1>
          <p className="text-gray-500 mb-6">سيتصل بك الراكب قريباً</p>

          <div className="card bg-amber-50 border-amber-200 mb-6 text-right">
            <div className="text-sm text-amber-700 mb-1">رقم طلبك</div>
            <div className="text-2xl font-bold text-amber-800 dir-ltr" dir="ltr">{orderResult.order_number}</div>
            <div className="text-xs text-amber-600 mt-1">احتفظ بهذا الرقم لتتبع طلبك</div>
          </div>

          <div className="card text-right mb-6">
            <div className="text-sm font-semibold text-gray-700 mb-3">ملخص الطلب</div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>المحل</span><span className="font-medium">{storeName}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>رسوم التوصيل</span><span className="font-medium text-amber-600">{formatFee(orderResult.delivery_fee)}</span>
            </div>
          </div>

          <a href={`/track?order=${orderResult.order_number}`} className="btn-primary block text-center no-underline">
            🔍 تتبع طلبي
          </a>
          <button
            onClick={() => { setStep("store"); setOrderResult(null); setItems(""); setCustomStore(""); setSelectedStore(null); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setEstimatedAmount(""); }}
            className="mt-3 text-sm text-gray-500 w-full"
          >
            طلب جديد
          </button>
        </div>
      )}
    </div>
  );
}
