"use client";

import { useState } from "react";
import {
  Store,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import { useLang } from "@/components/LangProvider";
import Link from "next/link";

const CATEGORIES = [
  "restaurant",
  "shop",
  "supermarket",
  "grocery",
  "pharmacy",
  "bakery",
  "cafe",
  "other",
];

interface MenuItem {
  name: string;
  price: string;
  description: string;
  image: File | null;
  imagePreview: string;
}

export default function StoreOwnerRegisterPage() {
  const { t, isRtl } = useLang();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  // Step 1: account
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Step 2: store details
  const [storeName, setStoreName] = useState("");
  const [storeDesc, setStoreDesc] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [storePhone, setStorePhone] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("08:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { name: "", price: "", description: "", image: null, imagePreview: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function addMenuItem() {
    setMenuItems([
      ...menuItems,
      { name: "", price: "", description: "", image: null, imagePreview: "" },
    ]);
  }

  function removeMenuItem(index: number) {
    if (menuItems.length <= 1) return;
    setMenuItems(menuItems.filter((_, i) => i !== index));
  }

  function updateMenuItem(
    index: number,
    field: keyof MenuItem,
    value: string | File | null
  ) {
    const updated = [...menuItems];
    const item = { ...updated[index] };
    if (field === "name") item.name = value as string;
    else if (field === "price") item.price = value as string;
    else if (field === "description") item.description = value as string;
    else if (field === "image") {
      item.image = value as File | null;
      if (value instanceof File) {
        item.imagePreview = URL.createObjectURL(value);
      }
    }
    updated[index] = item;
    setMenuItems(updated);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");

    if (!firstName.trim() || !lastName.trim()) {
      setAuthError(t("firstNameLastNameRequired"));
      return;
    }
    if (!phone.trim()) {
      setAuthError(t("phoneRequired"));
      return;
    }
    if (password.length < 8) {
      setAuthError(t("passwordMinLength"));
      return;
    }
    if (password !== confirmPw) {
      setAuthError(t("passwordMismatch"));
      return;
    }

    setAuthLoading(true);

    try {
      const res = await fetch("/api/store-owners/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Registration failed");
        return;
      }

      setOwnerId(data.owner.id);
      setStorePhone(phone.trim());
      setStep(2);
    } catch (err) {
      setAuthError(String(err));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeName.trim() || !ownerId) return;
    setLoading(true);
    setError("");

    try {
      // 1. Create store
      const storeRes = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          name: storeName.trim(),
          description: storeDesc.trim() || null,
          category,
          phone: storePhone.trim() || null,
          address: address.trim() || null,
          opening_time: openingTime || null,
          closing_time: closingTime || null,
        }),
      });

      const storeData = await storeRes.json();
      if (!storeRes.ok) {
        throw new Error(storeData.error || "Store creation failed");
      }

      const storeId = storeData.store.id;

      // 2. Upload images & create items
      for (const item of menuItems) {
        if (!item.name.trim()) continue;

        let imageUrl: string | null = null;

        if (item.image) {
          const formData = new FormData();
          formData.append("file", item.image);
          formData.append("storeId", storeId);
          formData.append("itemName", item.name.trim());

          const uploadRes = await fetch("/api/store-owners/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url;
          }
        }

        await fetch(`/api/stores/${storeId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name.trim(),
            description: item.description.trim() || null,
            price: parseInt(item.price) || 0,
            image_url: imageUrl,
          }),
        });
      }

      setSuccess(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <CheckCircle2
            size={64}
            style={{ color: "#10B981", margin: "0 auto 16px" }}
          />
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            {t("storeRegistrationSuccess")}
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: 24 }}>
            {t("storeRegistrationPending")}
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              background: "#4F46E5",
              color: "white",
              padding: "12px 24px",
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            {t("goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        padding: "20px 16px",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <Link href="/login" style={{ color: "#64748b" }}>
            <BackArrow size={24} />
          </Link>
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              {step === 1 ? t("createAccount") : t("createStore")}
            </h1>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {step === 1 ? t("step1of2") : t("step2of2")}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= 1 ? "#4F46E5" : "#E2E8F0",
            }}
          />
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= 2 ? "#4F46E5" : "#E2E8F0",
            }}
          />
        </div>

        {/* Step 1: Account */}
        {step === 1 && (
          <form onSubmit={handleRegister}>
            <div className="card" style={{ marginBottom: 16 }}>
              <label className="label">{t("firstName")}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder={t("firstNamePlaceholder")}
              />

              <label className="label" style={{ marginTop: 16 }}>
                {t("lastName")}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder={t("lastNamePlaceholder")}
              />

              <label className="label" style={{ marginTop: 16 }}>
                {t("phoneNumber")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="+216 XX XXX XXX"
              />

              <label className="label" style={{ marginTop: 16 }}>
                {t("password")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  style={{ paddingRight: 44 }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                  }}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <label className="label" style={{ marginTop: 16 }}>
                {t("confirmPassword")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="input"
                  style={{ paddingRight: 44 }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                  }}
                >
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authError && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {authLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                t("continue")
              )}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: "0.8rem",
                color: "#64748b",
                marginTop: 16,
              }}
            >
              {t("alreadyHaveAccount")}{" "}
              <Link
                href="/login"
                style={{
                  color: "#4F46E5",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {t("signIn")}
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: Store + Menu */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            {/* Store details card */}
            <div className="card" style={{ marginBottom: 16 }}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "#0f172a",
                  marginBottom: 16,
                }}
              >
                <Store
                  size={18}
                  style={{ display: "inline", marginRight: 8, verticalAlign: -3 }}
                />
                {t("storeDetails")}
              </h3>

              <label className="label">{t("storeName")}</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="input"
                placeholder={t("storeNamePlaceholder")}
              />

              <label className="label" style={{ marginTop: 16 }}>
                {t("description")}
              </label>
              <textarea
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                className="input"
                rows={2}
                placeholder={t("storeDescPlaceholder")}
              />

              <label className="label" style={{ marginTop: 16 }}>
                {t("category")}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ))}
              </select>

              <label className="label" style={{ marginTop: 16 }}>
                {t("storePhone")}
              </label>
              <input
                type="tel"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="input"
                placeholder="+216 XX XXX XXX"
              />

              <label className="label" style={{ marginTop: 16 }}>
                {t("address")}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input"
                placeholder={t("addressPlaceholder")}
              />

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <label className="label">{t("openingTime")}</label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">{t("closingTime")}</label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Menu items card */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "#0f172a",
                  }}
                >
                  {t("menuItems")}
                </h3>
                <button
                  type="button"
                  onClick={addMenuItem}
                  style={{
                    background: "#EEF2FF",
                    border: "1px solid #C7D2FE",
                    borderRadius: 8,
                    padding: "4px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#4F46E5",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Plus size={14} /> {t("addItem")}
                </button>
              </div>

              {menuItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    position: "relative",
                  }}
                >
                  {menuItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMenuItem(index)}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: isRtl ? "auto" : 8,
                        left: isRtl ? 8 : "auto",
                        background: "#FEE2E2",
                        border: "none",
                        borderRadius: 6,
                        padding: 4,
                        cursor: "pointer",
                        color: "#EF4444",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <div
                    style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                  >
                    {/* Image upload */}
                    <label
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        border: "2px dashed #CBD5E1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "#F8FAFC",
                      }}
                    >
                      {item.imagePreview ? (
                        <img
                          src={item.imagePreview}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Upload size={20} style={{ color: "#94A3B8" }} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          updateMenuItem(index, "image", file);
                        }}
                      />
                    </label>

                    {/* Item details */}
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          updateMenuItem(index, "name", e.target.value)
                        }
                        className="input"
                        placeholder={t("itemNamePlaceholder")}
                        style={{ marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateMenuItem(index, "price", e.target.value)
                          }
                          className="input"
                          placeholder={t("priceMillimes")}
                          style={{ flex: 1 }}
                        />
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateMenuItem(index, "description", e.target.value)
                        }
                        className="input"
                        placeholder={t("itemDescPlaceholder")}
                        style={{ marginTop: 8 }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%" }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                t("submitStore")
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
