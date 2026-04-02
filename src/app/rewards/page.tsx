"use client";

import { useState, useEffect } from "react";
import { Star, Trophy, Gift } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export default function RewardsPage() {
  const { t } = useLang();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("tawsil_user");
    if (!raw) { window.location.href = "/login"; return; }
    const user = JSON.parse(raw);
    if (user.role !== "customer") { window.location.href = "/"; return; }

    async function fetchPoints() {
      try {
        const res = await fetch(`/api/customers?email=${encodeURIComponent(user.email)}`);
        const data = await res.json();
        if (data.customer) setPoints(data.customer.points || 0);
      } catch (_) {}
      setLoading(false);
    }
    fetchPoints();
    // Poll every 10s so customer sees admin point updates instantly
    const interval = setInterval(fetchPoints, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p className="text-slate-500 text-center py-12">{t("loading")}</p>;
  }

  // Progress calculation
  let nextTarget: number;
  let nextRewardLabel: string;
  let progressPercent: number;

  if (points < 100) {
    nextTarget = 100;
    nextRewardLabel = "Sim recharge 5 DT";
    progressPercent = (points / 100) * 100;
  } else if (points < 200) {
    nextTarget = 200;
    nextRewardLabel = "Gift card 10 DT";
    progressPercent = ((points - 100) / 100) * 100;
  } else {
    nextTarget = 200;
    nextRewardLabel = "";
    progressPercent = 100;
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

      {/* Progress to next reward */}
      <div className="card mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t("nextReward")}</h2>
        {points >= 200 ? (
          <div className="text-center py-3">
            <Gift className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-700">{t("claimReward")}</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{points} pts</span>
              <span>{nextTarget} pts — {nextRewardLabel}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Reward tiers */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">{t("rewardTiers")}</h2>
        <div className="space-y-3">
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${points >= 100 ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${points >= 100 ? "bg-emerald-100" : "bg-slate-100"}`}>
              <Star className={`w-5 h-5 ${points >= 100 ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">100 pts</div>
              <div className="text-xs text-slate-500">Sim recharge 5 DT</div>
            </div>
            {points >= 100 && (
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700">&#10003;</span>
            )}
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${points >= 200 ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${points >= 200 ? "bg-emerald-100" : "bg-slate-100"}`}>
              <Gift className={`w-5 h-5 ${points >= 200 ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">200 pts</div>
              <div className="text-xs text-slate-500">Gift card 10 DT</div>
            </div>
            {points >= 200 && (
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700">&#10003;</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
