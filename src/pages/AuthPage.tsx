// ═══════════════════════════════════════════════════════════════════════════════════
// AuthPage - 登录页（单登录态，1:1 还原 Figma Make AuthPage 登录部分）
// 路由：/login → AuthPage
// 注册入口 → navigate("register")
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Eye, EyeOff, Loader2, ArrowLeft,
} from "lucide-react";
import type { Nav } from "../shared";
import { completeDemoLogin } from "../auth";
import { AuthMotion } from "../components/AuthMotion";

// ─── Left Brand Panel（对齐 Make AuthPage BrandPanel） ──────────────────────────
export function BrandPanel({ navigate }: Nav) {
  return (
    <div className="auth-brand" style={{
      position: "relative",
      flex: 1,
      minHeight: "100vh",

      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "60px 64px",
      overflow: "hidden",
    }}>
      <button type="button" onClick={() => navigate("landing")} className="auth-home-link" style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", alignSelf: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.18)", background: "rgba(0,0,0,.2)", color: "white", cursor: "pointer", fontSize: 15 }}>
        <ArrowLeft size={18} /> 返回首页
      </button>

      {/* Hero copy */}
      <div className="auth-brand-copy" style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 14px", borderRadius: 100,
          background: "rgba(255,138,31,.12)", border: "1px solid rgba(255,138,31,.3)",
          marginBottom: 28,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff8c20", boxShadow: "0 0 8px #ff8c20" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#ff8c20" }}>AI 视频创作平台 · 内测中</span>
        </div>
        <h1 style={{
          fontSize: 52, fontWeight: 800, color: "white", lineHeight: 1.1,
          marginBottom: 24, letterSpacing: "-0.025em",
        }}>
          AI 视频创作<br />
          <span style={{
            background: "linear-gradient(135deg,#ff8c20,#ffad4a 60%,#ffd47a)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>从剧本到成片</span>
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.6)", lineHeight: 1.7, marginBottom: 40 }}>
          剧本智能解析、AI 分镜规划、批量视频生成，一站式完成你的影视创作。接入 Seedance 2.0，效率提升 10 倍。
        </p>
        {/* Stats row */}
        <div className="auth-brand-stats" style={{ display: "flex", gap: 40 }}>
          {[["10x", "创作效率"], ["500+", "活跃创作者"], ["50+", "参考素材"]].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 2 }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="auth-brand-footer" style={{ position: "relative", zIndex: 1, fontSize: 12, color: "rgba(255,255,255,.3)" }}>
        © 2026 星核耀火 · 让创作更简单
      </div>
    </div>
  );
}

// ─── Login Card ────────────────────────────────────────────────────────────────
function LoginCard({ navigate }: { navigate: Nav["navigate"] }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleLogin = () => {
    if (!email.trim() || !pw) { setErr("请填写邮箱和密码"); return; }
    setLoading(true); setErr("");
    // 演示：模拟登录
    setTimeout(() => { setLoading(false); const target = completeDemoLogin(); navigate(target.page, target.extra); }, 1000);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 12, fontSize: 14,
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "rgba(255,138,31,.5)");
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)");

  return (
    <div className="auth-login-card" style={{
      width: 460, padding: 40,
      background: "#14111f",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 24,
      boxShadow: "0 40px 100px rgba(0,0,0,.6)",
    }}>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "white", marginBottom: 6 }}>
          欢迎回来
        </h2>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)" }}>
          登录继续你的创作之旅
        </p>
      </div>

      {/* Email */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.55)", marginBottom: 8 }}>
          邮箱
        </label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={inputStyle}
          onFocus={inputFocus}
          onBlur={inputBlur}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />
      </div>

      {/* Password */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>
            密码
          </label>
          <a href="#" style={{ fontSize: 11.5, color: "#ff8c20", textDecoration: "none", fontWeight: 500 }}>
            忘记密码？
          </a>
        </div>
        <div style={{ position: "relative" }}>
          <input
            value={pw}
            onChange={e => setPw(e.target.value)}
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            style={{ ...inputStyle, paddingRight: 44 }}
            onFocus={inputFocus}
            onBlur={inputBlur}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          <button
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "rgba(255,255,255,.35)",
              cursor: "pointer", display: "flex",
            }}>
            {showPw
              ? <EyeOff style={{ width: 16, height: 16 }} />
              : <Eye    style={{ width: 16, height: 16 }} />}
          </button>
        </div>
      </div>

      {err && (
        <p style={{ fontSize: 12, color: "#f87171", marginBottom: 14 }}>{err}</p>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
          background: loading
            ? "rgba(255,138,31,.6)"
            : "linear-gradient(135deg,#ff8c20,#ff5010)",
          border: "none", color: "black",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          cursor: "pointer",
          boxShadow: loading ? "none" : "0 8px 20px rgba(255,138,31,.3)",
        }}>
        {loading && <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />}
        {loading ? "登录中…" : "登录"}
      </button>

      <p style={{ textAlign: "center", fontSize: 12.5, color: "rgba(255,255,255,.4)", marginTop: 18 }}>
        没有账号？
        <button
          onClick={() => navigate("register")}
          style={{
            background: "none", border: "none", color: "#ff8c20",
            cursor: "pointer", fontSize: 12.5, fontWeight: 600,
          }}>
          立即注册
        </button>
      </p>
    </div>
  );
}

// ─── Auth Page（Full-screen two-column）────────────────────────────────────────
export function AuthPage({ navigate }: Nav) {
  return (
    <div className="auth-layout auth-login-layout" style={{
      minHeight: "100vh", display: "flex", background: "#0a0912", fontFamily: "inherit",
    }}>
      <AuthMotion />
      {/* Left brand panel */}
      <BrandPanel navigate={navigate} />

      {/* Right form area */}
      <div className="auth-form" style={{
        flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "transparent",
        padding: "40px 32px", position: "relative",
      }}>
        {/* Top bar */}
        <div className="auth-login-topbar" style={{ position: "absolute", top: 24, right: 32, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            还没有账号？
          </span>
          <button
            onClick={() => navigate("register")}
            style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "rgba(255,138,31,.12)", border: "1px solid rgba(255,138,31,.3)",
              color: "#ff8c20", cursor: "pointer",
            }}>
            立即注册
          </button>
        </div>

        <LoginCard navigate={navigate} />
      </div>
    </div>
  );
}

export default AuthPage;
