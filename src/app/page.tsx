"use client";

import { useState, useEffect } from "react";
import { Package, ShoppingBag, Bike, ChevronRight, ChevronLeft, Globe, Store, Coffee, Pill, ShoppingCart, UtensilsCrossed, Search, MapPin, CheckCircle2, ArrowLeft, ArrowRight, X } from "lucide-react";
import { formatFee, calculateDeliveryFee, getDistanceKm } from "@/lib/fees";
import { useLang } from "@/components/LangProvider";

interface StoreItem {
  id: string;
  name: string;
  category: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  image_url?: string | null;
}

interface UserProfile {
  name: string;
  phone: string;
  role: string;
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

function LandingPage() {
  const { t, isRtl, lang } = useLang();
  const Chevron = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">{t("appName")}</h1>
          <p className="text-slate-500 text-sm">{t("appTagline")}</p>
        </div>

        {/* Welcome */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">{t("welcome")}</h2>
          <p className="text-slate-500 text-sm mt-1">{t("chooseRole")}</p>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          <a
            href="/register/customer"
            className="card-hover flex items-center gap-4 no-underline"
          >
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900">{t("iAmCustomer")}</div>
              <div className="text-sm text-slate-500">{t("customerDesc")}</div>
            </div>
            <Chevron className="w-5 h-5 text-slate-400" />
          </a>

          <a
            href="/register/rider"
            className="card-hover flex items-center gap-4 no-underline"
          >
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center">
              <Bike className="w-7 h-7 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900">{t("iAmRider")}</div>
              <div className="text-sm text-slate-500">{t("riderDesc")}</div>
            </div>
            <Chevron className="w-5 h-5 text-slate-400" />
          </a>
        </div>

        {/* Language indicator */}
        <div className="flex items-center justify-center gap-2 mt-8 text-slate-400 text-xs">
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === "ar" ? "العربية" : lang === "fr" ? "Fran\u00e7ais" : "English"}</span>
        </div>
      </div>
    </div>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>{current}/{total}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function OrderPage() {
  const { t, isRtl, lang } = useLang();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storeSearch, setStoreSearch] = useState("");
  const [step, setStep] = useState<"store" | "details" | "info" | "review" | "success">("store");

  // Announcement banner
  const [announcement, setAnnouncement] = useState<{ id: string; message_ar: string; message_fr: string; message_en: string } | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  // Form state
  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
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

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    const saved = localStorage.getItem("tawsil_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.role === "customer") {
        setUser(parsed);
        if (parsed.savedAddress) {
          setCustomerAddress(parsed.savedAddress);
        }
      } else if (parsed.role === "rider") {
        window.location.href = "/rider";
        return;
      }
    } else {
      // No user — redirect to login
      window.location.href = "/login";
      return;
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (user) {
      fetch("/api/stores")
        .then((r) => r.json())
        .then((d) => setStores(d.stores || []))
        .finally(() => setStoresLoading(false));
    }
  }, [user]);

  // Fetch announcement + poll every 60s
  useEffect(() => {
    if (!user) return;
    function fetchAnnouncement() {
      fetch("/api/announcements")
        .then((r) => r.json())
        .then((d) => {
          const a = d.announcement;
          if (a) {
            const dismissed = localStorage.getItem(`tawsil_dismissed_announcement_${a.id}`);
            setAnnouncement(a);
            setAnnouncementDismissed(dismissed === "true");
          } else {
            setAnnouncement(null);
          }
        })
        .catch(() => {});
    }
    fetchAnnouncement();
    const interval = setInterval(fetchAnnouncement, 60000);
    return () => clearInterval(interval);
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
      if (data.error === "account_blocked") {
        setError(t("accountBlocked"));
        return;
      }
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
  if (!user) return <LandingPage />;

  const storeName = selectedStore ? selectedStore.name : customStore;
  const filteredStores = storeSearch
    ? stores.filter((s) => s.name.toLowerCase().includes(storeSearch.toLowerCase()))
    : stores;

  const stepNumber = step === "store" ? 1 : step === "details" ? 2 : step === "info" ? 3 : step === "review" ? 4 : 4;

  const announcementMessage = announcement
    ? (lang === "ar" ? announcement.message_ar : lang === "fr" ? (announcement.message_fr || announcement.message_ar) : (announcement.message_en || announcement.message_ar))
    : null;

  return (
    <div>
      {/* Announcement banner */}
      {announcement && !announcementDismissed && announcementMessage && (
        <div className="bg-indigo-600 text-white rounded-xl mx-4 mb-4 px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-medium">{announcementMessage}</span>
          <button
            onClick={() => {
              localStorage.setItem(`tawsil_dismissed_announcement_${announcement.id}`, "true");
              setAnnouncementDismissed(true);
            }}
            className="text-white hover:text-indigo-200 transition-colors flex-shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Pick store */}
      {step === "store" && (
        <div>
          {/* Gradient header */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 mb-6 text-white">
            <div className="text-xs font-medium opacity-75 mb-1">{t("appTagline")}</div>
            <div className="text-2xl font-bold">Tawsil 🛵</div>
            {user && <div className="text-sm opacity-90 mt-1">{t("hi")} {user.name?.split(" ")[0]} 👋</div>}
          </div>

          <StepProgress current={1} total={4} />
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900 mb-1">{t("selectStore")}</h1>
            <p className="text-slate-500 text-sm">{t("storeSubtitle")}</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" style={isRtl ? { right: '14px' } : { left: '14px' }} />
            <input
              type="text"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              placeholder={t("search")}
              className="input"
              style={isRtl ? { paddingRight: '40px' } : { paddingLeft: '40px' }}
            />
          </div>

          {/* Skeleton loaders */}
          {storesLoading && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card">
                  <div className="skeleton w-12 h-12 rounded-xl mb-3" />
                  <div className="skeleton h-4 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Store grid */}
          {!storesLoading && <div className="grid grid-cols-2 gap-2.5 mb-4">
            {filteredStores.map((store) => {
              const IconComp = CATEGORY_ICONS[store.category] || Package;
              return (
                <button
                  key={store.id}
                  onClick={() => { setSelectedStore(store); setCustomStore(""); setStep("details"); }}
                  className="card-hover flex flex-col items-center gap-2 text-center !p-4"
                >
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center overflow-hidden">
                    {store.image_url
                      ? <img src={store.image_url} alt={store.name} className="w-12 h-12 object-cover rounded-xl" />
                      : <IconComp className="w-6 h-6 text-indigo-600" />}
                  </div>
                  <div className="font-semibold text-sm text-slate-900 leading-tight">{store.name}</div>
                  {store.address && <div className="text-xs text-slate-400 truncate w-full">{store.address}</div>}
                </button>
              );
            })}
          </div>}

          <div className="relative my-5">
            <div className="border-t border-slate-200" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-slate-50 px-3 text-xs text-slate-400">{t("or")}</span>
          </div>

          {/* Custom store */}
          <div className="card">
            <label className="label">{t("otherStore")}</label>
            <input
              type="text"
              value={customStore}
              onChange={(e) => { setCustomStore(e.target.value); setSelectedStore(null); }}
              placeholder={t("otherStorePlaceholder")}
              className="input"
            />
            {customStore.trim() && (
              <button onClick={() => setStep("details")} className="btn-primary mt-3">
                {t("continue")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Describe order */}
      {step === "details" && (
        <div>
          <StepProgress current={2} total={4} />
          <button onClick={() => setStep("store")} className="flex items-center gap-1 text-indigo-600 text-sm mb-4 hover:text-indigo-700 transition-colors font-medium">
            <BackArrow className="w-4 h-4" />
            {t("back")}
          </button>

          {/* Store pill */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-1.5 mb-4">
            <Store className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-indigo-600 font-medium">{storeName}</span>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t("describeOrder")}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder={t("describeOrderPlaceholder")}
                rows={5}
                className="input resize-none"
                style={{ minHeight: "120px" }}
              />
            </div>

            <div>
              <label className="label">{t("estimatedAmount")}</label>
              <div className="relative">
                <span className="absolute top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400" style={isRtl ? { right: '14px' } : { left: '14px' }}>DT</span>
                <input
                  type="number"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value)}
                  placeholder="0.000"
                  className="input"
                  style={isRtl ? { paddingRight: '40px' } : { paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep("info")}
            disabled={!items.trim()}
            className="btn-primary mt-5"
          >
            {t("continue")}
          </button>
        </div>
      )}

      {/* Step 3: Info + location */}
      {step === "info" && (
        <div>
          <StepProgress current={3} total={4} />
          <button onClick={() => setStep("details")} className="flex items-center gap-1 text-indigo-600 text-sm mb-4 hover:text-indigo-700 transition-colors font-medium">
            <BackArrow className="w-4 h-4" />
            {t("back")}
          </button>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t("yourInfo")}</h2>
          </div>

          <div className="space-y-4 mb-5">
            {/* Readonly name/phone */}
            <div className="card bg-slate-50 border-slate-100">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-500">{t("name")}</span>
                <span className="font-medium text-slate-900">{user.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t("phone")}</span>
                <span className="font-medium text-slate-900" dir="ltr">{user.phone}</span>
              </div>
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
                    setGpsStatus("done");
                  },
                  () => setGpsStatus("error"),
                  { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
                );
              }}
              disabled={gpsStatus === "loading"}
              className={`w-full py-3.5 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-2 ${
                gpsStatus === "done"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              }`}
            >
              <MapPin className="w-4 h-4" />
              {gpsStatus === "loading"
                ? t("locating")
                : gpsStatus === "done"
                ? t("locationGranted")
                : t("useMyLocation")}
            </button>
            {gpsStatus === "error" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-amber-700 text-xs font-medium">{t("locationError")}</p>
                <p className="text-amber-600 text-xs mt-1">{t("locationErrorFallback")}</p>
              </div>
            )}

            {/* Address */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">
                  {t("address")} <span className="text-red-500">*</span>
                </label>
                {(() => {
                  const raw = localStorage.getItem("tawsil_user");
                  const addr = raw ? JSON.parse(raw).savedAddress : null;
                  return addr ? (
                    <button
                      type="button"
                      onClick={() => setCustomerAddress(addr)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {t("useSavedAddress")}
                    </button>
                  ) : null;
                })()}
              </div>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>

          <button
            onClick={() => setStep("review")}
            disabled={!customerAddress.trim()}
            className="btn-primary"
          >
            {t("continue")}
          </button>
        </div>
      )}

      {/* Step 4: Review */}
      {step === "review" && (
        <div>
          <StepProgress current={4} total={4} />
          <button onClick={() => setStep("info")} className="flex items-center gap-1 text-indigo-600 text-sm mb-4 hover:text-indigo-700 transition-colors font-medium">
            <BackArrow className="w-4 h-4" />
            {t("back")}
          </button>

          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{t("orderSummary")}</h2>
          </div>

          {/* Summary card */}
          <div className="card mb-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">{t("store")}</span>
              <span className="font-medium text-slate-900">{storeName}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 mb-1">{t("whatYouOrdered")}</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{items}</div>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500">{t("address")}</span>
              <span className="font-medium text-slate-900 text-right max-w-[60%]">{customerAddress}</span>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="card border-indigo-200 bg-indigo-50/50 mb-4">
            <div className="text-sm font-bold text-slate-900 mb-3">{t("paymentDetails")}</div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t("goodsPrice")}</span>
              <span className="text-slate-800">{estimatedAmount ? `~${estimatedAmount} DT` : t("determinedAtPurchase")}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 mt-2">
              <span>{t("deliveryFee")}</span>
              <span className="text-indigo-600 font-bold">
                {customerLat && customerLng
                  ? formatFee(calculateDeliveryFee(getDistanceKm(
                      selectedStore?.lat ?? 36.5333, selectedStore?.lng ?? 10.5167,
                      customerLat, customerLng
                    )))
                  : `${t("fromPrice")} ${formatFee(2000)}`}
              </span>
            </div>
            <div className="border-t border-indigo-200 mt-3 pt-3 text-xs text-slate-500">
              {t("cashOnDelivery")}
            </div>
          </div>

          {error && <div className="card border-red-200 text-red-600 text-sm mb-3">{error}</div>}

          <button
            onClick={submitOrder}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t("submitting") : t("confirmOrder")}
          </button>
        </div>
      )}

      {/* Step 5: Success */}
      {step === "success" && orderResult && (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("orderConfirmed")}</h1>
          <p className="text-slate-500 mb-6">{t("riderWillContact")}</p>

          <div className="card border-indigo-200 mb-5">
            <div className="text-sm text-slate-500 mb-1">{t("orderNumber")}</div>
            <div className="text-2xl font-bold text-indigo-600" dir="ltr">{orderResult.order_number}</div>
            <div className="text-xs text-slate-400 mt-1">{t("keepOrderNumber")}</div>
          </div>

          <div className="card mb-5">
            <div className="text-sm font-bold text-slate-900 mb-3">{t("orderSummary")}</div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t("store")}</span><span className="font-medium text-slate-900">{storeName}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600 mt-2">
              <span>{t("deliveryFee")}</span><span className="font-bold text-indigo-600">{formatFee(orderResult.delivery_fee)}</span>
            </div>
          </div>

          <a href={`/track?order=${orderResult.order_number}`} className="btn-primary block text-center no-underline">
            {t("trackOrder")}
          </a>
          <button
            onClick={() => { setStep("store"); setOrderResult(null); setItems(""); setCustomStore(""); setSelectedStore(null); setCustomerAddress(""); setEstimatedAmount(""); setCustomerLat(null); setCustomerLng(null); setGpsStatus("idle"); setStoreSearch(""); }}
            className="btn-secondary mt-3"
          >
            {t("newOrder")}
          </button>
        </div>
      )}
    </div>
  );
}
