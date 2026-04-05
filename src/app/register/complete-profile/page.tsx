"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/components/LangProvider";
import { supabaseClient } from "@/lib/supabase-client";

export default function CompleteProfilePage() {
  const { t } = useLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+216");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserId(user.id);
      const meta = user.user_metadata || {};
      setEmail(user.email || "");
      if (meta.full_name) {
        const parts = meta.full_name.split(" ");
        setFirstName(meta.first_name || parts[0] || "");
        setLastName(meta.last_name || parts.slice(1).join(" ") || "");
      } else {
        setFirstName(meta.first_name || "");
        setLastName(meta.last_name || "");
      }
      if (meta.phone) setPhone(meta.phone);
      setPageLoading(false);
    }
    loadUser();
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = t("required");
    if (!lastName.trim()) e.lastName = t("required");
    if (!phone.trim() || phone.length < 12) e.phone = t("invalidPhone");
    return e;
  }

  async function submit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setErrors({});

    const { error } = await supabaseClient.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      },
    });

    if (error) {
      setLoading(false);
      setErrors({ form: error.message });
      return;
    }

    // Create customer in DB
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email,
          phone: phone.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        setErrors({ form: data.error || "Failed to create account. Please try again." });
        return;
      }
    } catch (_) {
      setLoading(false);
      setErrors({ form: "Network error. Please try again." });
      return;
    }

    localStorage.setItem("tawsil_user", JSON.stringify({
      user_id: userId,
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      phone: phone.trim(),
      role: "customer",
    }));

    window.location.href = "/app";
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: `1px solid ${hasError ? "#f87171" : "#E2E8F0"}`,
    fontSize: "0.9rem", outline: "none", background: "#ffffff",
    color: "#0f172a", transition: "border-color 0.15s",
  });

  if (pageLoading) {
    return (
      <div style={{
        minHeight: "100dvh", background: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ color: "#6366f1", fontSize: "1.1rem", fontWeight: 600 }}>{t("loading")}</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#F8FAFC",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, color: "#6366f1", letterSpacing: "-0.05em" }}>Tawsil</div>
        <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 6 }}>{t("completeProfileDesc")}</div>
      </div>

      {/* Card */}
      <div style={{
        background: "#ffffff", border: "1px solid #E2E8F0", borderRadius: 20,
        padding: "28px 24px", width: "100%", maxWidth: 400,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.07)",
      }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", marginBottom: 20, textAlign: "center" }}>
          {t("completeProfile")}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{t("firstName")} *</label>
              <input
                type="text" value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: "" })); }}
                style={inputStyle(!!errors.firstName)}
              />
              {errors.firstName && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.firstName}</p>}
            </div>
            <div>
              <label className="label">{t("lastName")} *</label>
              <input
                type="text" value={lastName}
                onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: "" })); }}
                style={inputStyle(!!errors.lastName)}
              />
              {errors.lastName && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.lastName}</p>}
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="label">{t("email")}</label>
            <input
              type="email" value={email} readOnly dir="ltr"
              style={{ ...inputStyle(), background: "#f8fafc", color: "#64748b" }}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label">{t("phone")} *</label>
            <input
              type="tel" value={phone} dir="ltr" maxLength={13}
              onChange={(e) => {
                let v = e.target.value;
                if (!v.startsWith("+216")) v = "+216" + v.replace(/^\+216/, "");
                setPhone(v); setErrors((p) => ({ ...p, phone: "" }));
              }}
              style={inputStyle(!!errors.phone)}
            />
            {errors.phone && <p style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: 4 }}>{errors.phone}</p>}
          </div>

          {errors.form && <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{errors.form}</p>}

          {/* Submit */}
          <button
            onClick={submit} disabled={loading}
            className="btn-primary"
            style={{ opacity: loading ? 0.6 : 1, marginTop: 4, border: "none", cursor: "pointer" }}
          >
            {loading ? t("updating") : t("continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
