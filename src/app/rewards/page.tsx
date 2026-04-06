"use client";

import { useState, useEffect } from "react";
import { Star, Trophy, Gift, ChevronDown, ChevronUp, Package, Users, Award, Clock } from "lucide-react";
import { useLang } from "@/components/LangProvider";

interface PointsEntry {
  id: string;
  delta: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

const TIERS = [
  { min: 0, max: 99, key: "bronze", color: "bg-amber-100 text-amber-700 border-amber-300", icon: "🥉" },
  { min: 100, max: 199, key: "silver", color: "bg-slate-100 text-slate-600 border-slate-300", icon: "🥈" },
  { min: 200, max: Infinity, key: "gold", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: "🟡" },
];

const REWARDS = [
  { tier: 100, icon: Star, labelKey: "simRecharge5" },
  { tier: 200, icon: Gift, labelKey: "giftCard10" },
];

function reasonLabel(entry: PointsEntry, t: (k: string) => string): string {
  const abs = Math.abs(entry.delta);
  const pts = `${abs} ${t("pts")}`;
  switch (entry.reason) {
    case "order": return `${pts} ${t("ptsFromOrder")} ${entry.reference_id || ""}`;
    case "referral": return `${pts} ${t("ptsFromReferral")}`;
    case "referral_bonus": return `${pts} ${t("ptsFromReferralBonus")}`;
    case "redemption": return `${pts} ${t("ptsFromRedemption")}`;
    default: return `${pts} — ${entry.reason}`;
  }
}

export default function RewardsPage() {
  const { t } = useLang();
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsEntry[]>([]);
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

  useEffect(() => {
    if (!customerId) return;
    fetch(`/api/customers/points-history?customer_id=${customerId}`)
      .then(r => r.json())
      .then(data => { if (data.history) setHistory(data.history); })
      .catch(() => {});
  }, [customerId, points]);

  if (loading) {
    return <p className="text-slate-500 text-center py-12">{t("loading")}</p>;
  }

  const currentTier = TIERS.find(tier => points >= tier.min && points <= tier.max) || TIERS[0];

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

      {/* Points balance + tier badge */}
      <div className="card mb-4">
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            <span className="text-4xl font-bold text-slate-900">{points}</span>
          </div>
          <p className="text-sm text-slate-500 mb-3">{t("pointsBalance")}</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentTier.color}`}>
            {currentTier.icon} {t(`tier${currentTier.key.charAt(0).toUpperCase() + currentTier.key.slice(1)}` as "tierBronze" | "tierSilver" | "tierGold")}
          </span>
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
            const alreadyRedeemed = history.some(h => h.reason === "redemption" && Math.abs(h.delta) === tier);
            return (
              <div key={tier} className={`flex items-center gap-3 p-3 rounded-xl border ${unlocked ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unlocked ? "bg-emerald-100" : "bg-slate-100"}`}>
                  <Icon className={`w-5 h-5 ${unlocked ? "text-emerald-600" : "text-slate-400"}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{tier} pts</div>
                  <div className="text-xs text-slate-500">{t(labelKey as "simRecharge5" | "giftCard10")}</div>
                </div>
                {unlocked && !alreadyRedeemed && (
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
                {unlocked && alreadyRedeemed && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Points history */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t("pointsHistory")}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">{t("noPointsHistory")}</p>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${entry.delta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {entry.delta > 0 ? "+" : ""}{entry.delta}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-700">{reasonLabel(entry, t)}</div>
                  <div className="text-xs text-slate-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
