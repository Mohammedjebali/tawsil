"use client";

import { useState, useEffect } from "react";
import { User, CheckCircle2, Star, Share2, Copy, Gift } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export default function ProfilePage() {
  const { t, isRtl } = useLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [points, setPoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Referral state
  const [referralCode, setReferralCode] = useState("");
  const [successfulReferrals, setSuccessfulReferrals] = useState(0);
  const [referralBonusClaimed, setReferralBonusClaimed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("tawsil_user");
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    const user = JSON.parse(raw);
    if (user.role !== "customer") {
      window.location.href = "/";
      return;
    }
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setSavedAddress(user.savedAddress || "");

    // Fetch points + referral info
    if (user.email) {
      fetch(`/api/customers?email=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d.customer) {
            setPoints(d.customer.points || 0);
            setReferralCode(d.customer.referral_code || "");
            setSuccessfulReferrals(d.customer.successful_referrals_count || 0);
            setReferralBonusClaimed(d.customer.referral_bonus_claimed || false);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    // Update localStorage
    const raw = localStorage.getItem("tawsil_user");
    if (raw) {
      const user = JSON.parse(raw);
      user.firstName = firstName;
      user.lastName = lastName;
      user.name = `${firstName} ${lastName}`.trim();
      user.savedAddress = savedAddress;
      localStorage.setItem("tawsil_user", JSON.stringify(user));
    }

    // Update backend
    try {
      await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, first_name: firstName, last_name: lastName }),
      });
    } catch (_) {}

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleShare() {
    const shareText = `استخدم كودي ${referralCode} على تطبيق Tawsil وإرباح 20 نقطة مجاناً! أحسن توصيل في منزل النور 🛵 tawsil.vercel.app`;
    const shareUrl = `https://tawsil.vercel.app/register?ref=${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Tawsil", text: shareText, url: shareUrl });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 3000);
    }
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(referralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  }

  async function handleClaimBonus() {
    setClaimingBonus(true);
    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, claim_referral_bonus: true }),
      });
      const data = await res.json();
      if (data.customer) {
        setPoints(data.customer.points || 0);
        setReferralBonusClaimed(data.customer.referral_bonus_claimed || false);
      }
    } catch (_) {}
    setClaimingBonus(false);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t("editProfile")}</h1>
          </div>
        </div>
      </div>

      {/* Points balance */}
      <a href="/rewards" className="card flex items-center gap-3 !py-3 mb-4 no-underline">
        <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">{t("pointsBalance")}</div>
          <div className="text-xs text-slate-500">{t("rewards")}</div>
        </div>
        <span className="text-lg font-bold text-blue-700">{points} pts</span>
      </a>

      {/* Referral card */}
      {referralCode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-700" />
            {t("referFriend")}
          </h3>
          <p className="text-xs text-slate-500 mb-2">{t("yourReferralCode")}</p>
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleCopyCode}
              className="flex-1 bg-white border border-blue-200 rounded-lg py-2.5 px-4 text-center cursor-pointer hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl font-bold text-blue-700 tracking-widest font-mono">
                {referralCode}
              </span>
            </button>
            <button
              onClick={handleCopyCode}
              className="p-2.5 bg-white border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          {codeCopied && (
            <p className="text-xs text-emerald-600 font-medium mb-2">{t("codeCopied")}</p>
          )}
          <button
            onClick={handleShare}
            className="btn-primary !py-2.5 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {t("shareCode")}
          </button>
          <p className="text-xs text-slate-500 mt-3">
            {successfulReferrals} {t("friendsReferred")}
          </p>

          {/* Bonus claim */}
          {successfulReferrals >= 5 && !referralBonusClaimed && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">{t("referralBonusTitle")}</span>
              </div>
              <button
                onClick={handleClaimBonus}
                disabled={claimingBonus}
                className="w-full py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {claimingBonus ? "..." : t("claimBonus")}
              </button>
            </div>
          )}
          {referralBonusClaimed && (
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("bonusClaimed")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {/* First Name */}
        <div>
          <label className="label">{t("firstName")}</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="label">{t("lastName")}</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="label">{t("email")}</label>
          <input
            type="email"
            value={email}
            readOnly
            className="input bg-slate-50 text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Phone (read-only) */}
        <div>
          <label className="label">{t("phone")}</label>
          <input
            type="tel"
            value={phone}
            readOnly
            dir="ltr"
            className="input bg-slate-50 text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Saved Address */}
        <div>
          <label className="label">{t("savedAddress")}</label>
          <textarea
            value={savedAddress}
            onChange={(e) => setSavedAddress(e.target.value)}
            placeholder={t("savedAddressPlaceholder")}
            rows={3}
            className="input resize-none"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary mt-6"
      >
        {saving ? t("updating") : saved ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {t("profileSaved")}
          </span>
        ) : t("saveChanges")}
      </button>
    </div>
  );
}
