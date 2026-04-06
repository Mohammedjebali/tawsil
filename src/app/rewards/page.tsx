"use client";

import { useState, useEffect } from "react";
import { Star, Trophy, Gift, ChevronDown, ChevronUp, Package, Users, Award } from "lucide-react";
import { useLang } from "@/components/LangProvider";

const REWARDS = [
  { tier: 100, icon: Star, labelKey: "simRecharge5" },
  { tier: 200, icon: Gift, labelKey: "giftCard10" },
];

export default function RewardsPage() {
  const { t } = useLang();
  const [points, setPoints] = useState(0);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("tawsil_user");
    if (!raw) { window.location.href = "/login"; return; }
    const user = JSON.parse(raw);
    if (user.role !== "customer") { window.location.href = "/app"; return; }

    async function fetchData() {
      try {
        const res = await fetch(`/api/customers?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.customer) {
          setPoints(data.customer.points || 0);
          setCustomerId(data.customer.id);
        }
      } catch (_) {}
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-slate-500 text-center py-12">{t("loading")}</p>;
  }

  async function handleRedeem(tier: number) {
    if (!customerId) return;
    setRedeeming(tier);
    setRedeemMsg(null);
    try {
      const res = await fetch("/api/customers/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId, tier }),
      });
      const data = await res.json();
      if (data.success) {
        setPoints(data.new_points);
        setRedeemMsg(t("redeemSuccess"));
      } else {
        setRedeemMsg(t("redeemError"));
      }
    } catch {
      setRedeemMsg(t("redeemError"));
    } finally {
      setRedeeming(null);
      setTimeout(() => setRedeemMsg(null), 4000);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("rewards")}</h1>
            <p className="text-sm text-slate-500">{t("pointsPerOrder")}</p>
          </div>
        </div>
      </div>

      {/* Points balance */}
      <div className="card mb-4">
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            <span className="text-4xl font-bold text-slate-900">{points}</span>
          </div>
          <p className="text-sm text-slate-500">{t("pointsBalance")}</p>
        </div>
      </div>

      {/* How it works */}
      <div className="card mb-4">
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full flex items-center justify-between text-sm font-semibold text-slate-700"
        >
          {t("howItWorks")}
          {showHowItWorks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showHowItWorks && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
              <Package className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <span className="text-sm text-slate-700">{t("earnPerDelivery")}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
              <Users className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <span className="text-sm text-slate-700">{t("earnPerReferral")}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
              <Award className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <span className="text-sm text-slate-700">{t("earnReferralBonus")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Redeem message */}
      {redeemMsg && (
        <div className={`card mb-4 ${redeemMsg === t("redeemSuccess") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"} text-sm font-medium`}>
          {redeemMsg}
        </div>
      )}

      {/* Reward tiers with redeem */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t("rewardTiers")}</h2>
        <div className="space-y-3">
          {REWARDS.map(({ tier, icon: Icon, labelKey }) => {
            const unlocked = points >= tier;
            return (
              <div key={tier} className={`flex items-center gap-3 p-3 rounded-xl border ${unlocked ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unlocked ? "bg-emerald-100" : "bg-slate-100"}`}>
                  <Icon className={`w-5 h-5 ${unlocked ? "text-emerald-600" : "text-slate-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{tier} pts</div>
                  <div className="text-xs text-slate-500">{t(labelKey as "simRecharge5" | "giftCard10")}</div>
                </div>
                {unlocked && (
                  <button
                    onClick={() => {
                      if (confirm(t("redeemConfirmMsg").replace("{pts}", String(tier)).replace("{reward}", t(labelKey as "simRecharge5" | "giftCard10")))) {
                        handleRedeem(tier);
                      }
                    }}
                    disabled={redeeming === tier}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {redeeming === tier ? "..." : t("redeem")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
