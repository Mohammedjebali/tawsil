"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const STORES = [
  "Pâtisserie Jrad",
  "AZIZA",
  "Lablebi Rached",
  "Akacha Food",
  "El Mazraa",
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#060818", color: "#fff", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrollY > 40 ? "rgba(6,8,24,0.9)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(16px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.3s ease",
      }}>
        <span style={{ fontWeight: 900, fontSize: "1.4rem", letterSpacing: "-0.04em", color: "#fff" }}>
          Tawsil<span style={{ color: "#818cf8" }}>.</span>
        </span>
        <Link href="/app" style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff",
          padding: "10px 22px",
          borderRadius: 50,
          fontWeight: 700,
          fontSize: "0.875rem",
          textDecoration: "none",
          boxShadow: "0 0 20px rgba(99,102,241,0.4)",
          transition: "all 0.2s ease",
        }}>
          Open App
        </Link>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 24px 80px",
        position: "relative",
        textAlign: "center",
        overflow: "hidden",
      }}>
        {/* bg glow orbs */}
        <div style={{
          position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "10%",
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: "30%", right: "5%",
          width: 250, height: 250,
          background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,0.12)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: 50,
          padding: "6px 16px",
          fontSize: "0.8rem",
          color: "#a5b4fc",
          fontWeight: 600,
          marginBottom: 32,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px #6366f1", display: "inline-block" }} />
          منزل النور، المنستير — التوصيل السريع
        </div>

        {/* headline */}
        <h1 style={{
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          marginBottom: 24,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.7s ease 0.1s",
        }}>
          كل حاجة تجيك<br />
          <span style={{
            background: "linear-gradient(135deg, #818cf8, #c084fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            على بابك
          </span>
        </h1>

        <p style={{
          fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
          color: "#94a3b8",
          maxWidth: 520,
          lineHeight: 1.7,
          marginBottom: 48,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.7s ease 0.2s",
        }}>
          اختر من أي محل في المنستير — راكبنا يشري ويوصّل. دفع عند الاستلام.
        </p>

        {/* CTA buttons */}
        <div style={{
          display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.7s ease 0.3s",
        }}>
          <Link href="/app" style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            padding: "16px 36px",
            borderRadius: 50,
            fontWeight: 800,
            fontSize: "1rem",
            textDecoration: "none",
            boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 4px 20px rgba(0,0,0,0.3)",
            letterSpacing: "-0.02em",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            اطلب الآن
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <a href="#how" style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0",
            padding: "16px 36px",
            borderRadius: 50,
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
            backdropFilter: "blur(8px)",
          }}>
            كيف تشتغل؟
          </a>
        </div>

        {/* floating phone mockup */}
        <div style={{
          marginTop: 80,
          position: "relative",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(50px)",
          transition: "all 0.9s ease 0.4s",
        }}>
          <div style={{
            width: 260,
            height: 520,
            background: "linear-gradient(180deg, #0f1629 0%, #0a0f1e 100%)",
            borderRadius: 40,
            border: "1.5px solid rgba(99,102,241,0.3)",
            boxShadow: "0 0 80px rgba(99,102,241,0.25), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
            overflow: "hidden",
            position: "relative",
            animation: "float 4s ease-in-out infinite",
          }}>
            {/* phone notch */}
            <div style={{ width: 100, height: 28, background: "#060818", borderRadius: "0 0 20px 20px", margin: "0 auto", position: "relative", zIndex: 2 }} />
            {/* phone screen content */}
            <div style={{ padding: "8px 16px" }}>
              {/* app header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontWeight: 900, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.04em" }}>Tawsil</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
              </div>
              {/* search bar */}
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <span style={{ fontSize: "0.7rem", color: "#475569" }}>ابحث عن محل...</span>
              </div>
              {/* store cards */}
              {STORES.slice(0, 4).map((s, i) => (
                <div key={s} style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  marginBottom: 8,
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", gap: 10,
                  animation: `slideIn 0.5s ease ${0.5 + i * 0.1}s both`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `rgba(99,102,241,${0.15 + i * 0.05})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</div>
                    <div style={{ fontSize: "0.55rem", color: "#475569", marginTop: 2 }}>منزل النور</div>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* floating badges around phone */}
          <div style={{
            position: "absolute", top: 80, right: -70,
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 16,
            padding: "10px 14px",
            backdropFilter: "blur(12px)",
            animation: "floatRight 3s ease-in-out infinite",
            whiteSpace: "nowrap",
          }}>
            <div style={{ fontSize: "0.65rem", color: "#a5b4fc", fontWeight: 700 }}>✓ طلب جديد</div>
            <div style={{ fontSize: "0.55rem", color: "#64748b", marginTop: 2 }}>يتم التوصيل الآن</div>
          </div>

          <div style={{
            position: "absolute", bottom: 120, left: -80,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 16,
            padding: "10px 14px",
            backdropFilter: "blur(12px)",
            animation: "floatLeft 3.5s ease-in-out infinite",
            whiteSpace: "nowrap",
          }}>
            <div style={{ fontSize: "0.65rem", color: "#6ee7b7", fontWeight: 700 }}>⚡ تم التوصيل</div>
            <div style={{ fontSize: "0.55rem", color: "#64748b", marginTop: 2 }}>خلال 25 دقيقة</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "100px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <p style={{ color: "#818cf8", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>كيف يشتغل</p>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em" }}>ثلاث خطوات بسيطة</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {[
            { num: "01", icon: "🏪", title: "اختر المحل", desc: "ابحث واختر من بين المحلات المتاحة في منزل النور" },
            { num: "02", icon: "🛵", title: "الراكب يشري", desc: "راكبنا يروح للمحل، يشري المنتجات ويدفع" },
            { num: "03", icon: "🏠", title: "يوصل عندك", desc: "تدفع عند الاستلام. سهل وسريع" },
          ].map((step, i) => (
            <div key={i} style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 24,
              padding: 32,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 16, right: 20,
                fontSize: "3rem", fontWeight: 900,
                color: "rgba(99,102,241,0.08)",
                lineHeight: 1,
              }}>{step.num}</div>
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{step.icon}</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.02em" }}>{step.title}</h3>
              <p style={{ color: "#64748b", lineHeight: 1.7, fontSize: "0.95rem" }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <p style={{ color: "#818cf8", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>لماذا تواصل</p>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em" }}>مزايا تفرّقنا</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { icon: "💸", title: "دفع عند الاستلام", desc: "ما فيه حاجة لبطاقة بنكية" },
            { icon: "📍", title: "تتبع حي", desc: "اعرف وين الراكب في الوقت الحقيقي" },
            { icon: "⚡", title: "توصيل سريع", desc: "في أقل من 30 دقيقة" },
            { icon: "🎁", title: "نقاط ولاء", desc: "اجمع نقاط واربح مكافآت" },
          ].map((f, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 20,
              padding: 24,
              textAlign: "center",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 12 }}>{f.icon}</div>
              <h4 style={{ fontWeight: 800, marginBottom: 8, fontSize: "0.95rem" }}>{f.title}</h4>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STORES */}
      <section style={{ padding: "80px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ color: "#818cf8", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>المحلات المتاحة</p>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, letterSpacing: "-0.04em" }}>نوصّل منها كلها</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {STORES.map((s) => (
            <div key={s} style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 50,
              padding: "10px 20px",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#a5b4fc",
            }}>{s}</div>
          ))}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 50,
            padding: "10px 20px",
            fontSize: "0.9rem",
            color: "#475569",
          }}>+ قريباً المزيد</div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section style={{ padding: "100px 24px", textAlign: "center" }}>
        <div style={{
          maxWidth: 700,
          margin: "0 auto",
          background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 32,
          padding: "64px 40px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: 400, height: 400,
            background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <h2 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 16 }}>
            جاهز تطلب؟
          </h2>
          <p style={{ color: "#64748b", fontSize: "1.05rem", marginBottom: 40, lineHeight: 1.7 }}>
            ما تحتاج تنزّل أي شيء — يشتغل مباشرة من متصفحك
          </p>
          <Link href="/app" style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            padding: "18px 48px",
            borderRadius: 50,
            fontWeight: 800,
            fontSize: "1.1rem",
            textDecoration: "none",
            boxShadow: "0 0 50px rgba(99,102,241,0.5)",
            display: "inline-flex", alignItems: "center", gap: 10,
            letterSpacing: "-0.02em",
          }}>
            افتح التطبيق
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "32px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        maxWidth: 1000,
        margin: "0 auto",
      }}>
        <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "-0.04em" }}>
          Tawsil<span style={{ color: "#818cf8" }}>.</span>
        </span>
        <span style={{ color: "#334155", fontSize: "0.85rem" }}>© 2026 Tawsil — منزل النور، المنستير</span>
        <a href="mailto:contact@tawsildelivery.com" style={{ color: "#475569", fontSize: "0.85rem", textDecoration: "none" }}>
          contact@tawsildelivery.com
        </a>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-16px); }
        }
        @keyframes floatRight {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-10px) translateX(4px); }
        }
        @keyframes floatLeft {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-8px) translateX(-4px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        html { scroll-behavior: smooth; }
        a:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
