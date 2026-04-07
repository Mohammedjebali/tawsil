"use client";

import { useState, useEffect } from "react";
import { Search, Star, MapPin, Clock, ArrowLeft, ArrowRight, Store, UtensilsCrossed, ShoppingCart, Pill, Coffee } from "lucide-react";
import { useLang } from "@/components/LangProvider";
import Link from "next/link";

interface StoreData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number;
  delivery_fee: number;
  opening_time: string | null;
  closing_time: string | null;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  restaurant: UtensilsCrossed,
  grocery: ShoppingCart,
  pharmacy: Pill,
  bakery: Store,
  cafe: Coffee,
  supermarket: ShoppingCart,
};

const CATEGORIES = ["allCategories", "restaurant", "grocery", "pharmacy", "bakery", "cafe", "supermarket"] as const;

export default function StoresPage() {
  const { t, isRtl } = useLang();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  useEffect(() => {
    fetchStores();
  }, [category]);

  async function fetchStores() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/stores?${params}`);
      const data = await res.json();
      setStores(data.stores || []);
    } catch {
      setStores([]);
    }
    setLoading(false);
  }

  function handleSearch() {
    fetchStores();
  }

  const filtered = search
    ? stores.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : stores;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="text-slate-500 hover:text-slate-700">
          <BackArrow size={22} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t("browseStores")}</h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" style={{ [isRtl ? "right" : "left"]: 12 }} />
        <input
          className="input w-full"
          style={{ [isRtl ? "paddingRight" : "paddingLeft"]: 40 }}
          placeholder={t("searchStores")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = cat === "allCategories" ? !category : category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat === "allCategories" ? "" : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t(cat)}
            </button>
          );
        })}
      </div>

      {/* Store grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-32 bg-slate-100 rounded-lg mb-3" />
              <div className="h-5 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">{stores.length === 0 && !search ? t("noStoresYet") : t("noStoresFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((store) => {
            const Icon = CATEGORY_ICONS[store.category] || Store;
            return (
              <Link
                key={store.id}
                href={`/stores/${store.id}`}
                className="card hover:shadow-md transition-shadow no-underline"
              >
                {/* Cover */}
                <div className="h-32 bg-gradient-to-br from-indigo-50 to-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {store.cover_url ? (
                    <img src={store.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-10 h-10 text-indigo-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start gap-3">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                      <Icon className="w-6 h-6 text-indigo-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{store.name}</h3>
                    <p className="text-xs text-slate-500 capitalize">{t(store.category)}</p>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  {store.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {store.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {(store.delivery_fee / 1000).toFixed(3)} {t("dt")}
                  </span>
                  {store.opening_time && store.closing_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {store.opening_time.slice(0, 5)}-{store.closing_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
