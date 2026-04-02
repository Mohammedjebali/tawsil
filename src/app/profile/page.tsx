"use client";

import { useState, useEffect } from "react";
import { User, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/LangProvider";

export default function ProfilePage() {
  const { t, isRtl } = useLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
