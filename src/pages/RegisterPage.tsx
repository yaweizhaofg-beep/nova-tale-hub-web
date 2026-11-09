// ═══════════════════════════════════════════════════════════════════════════════════
// RegisterPage - 创建账号页（1:1 还原 Figma Make LandingSection.tsx RegisterPage）
// 字段：账号 / 密码+确认密码 / 手机号+短信验证码 / 图形验证码 / 邀请码
// 提交后 navigate("onboarding")（不做二次实名验证）
// 本页为演示界面，未接真实认证服务。
// ═══════════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Eye, EyeOff, Loader2, RefreshCw,
} from "lucide-react";
import type { Nav } from "../shared";
import { completeDemoLogin } from "../auth";
import { BrandPanel } from "./AuthPage";
import { AuthMotion } from "../components/AuthMotion";

export function RegisterPage({ navigate }: Nav) {
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [account, setAccount] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const sendSms = () => {
    if (!phone.trim()) { setErr("请输入手机号"); return; }
    setCountdown(60);
    const t = setInterval(() => setCountdown(v => {
      if (v <= 1) { clearInterval(t); return 0; }
      return v - 1;
    }), 1000);
    setErr("");
  };

  const handleSubmit = () => {
    if (!account.trim())    { setErr("请填写账号"); return; }
    if (account.length < 6 || account.length > 20) { setErr("账号长度为 6–20 位字母或数字"); return; }
    if (!pw)                { setErr("请设置密码"); return; }
    if (pw.length < 8)     { setErr("密码至少 8 位"); return; }
    if (!pw2)              { setErr("请确认密码"); return; }
    if (pw !== pw2)        { setErr("两次密码不一致"); return; }
    if (!phone.trim())      { setErr("请输入手机号"); return; }
    if (!smsCode.trim() || smsCode.length < 6) { setErr("请输入 6 位短信验证码"); return; }
    setLoading(true);
    setErr("");
    // 演示：模拟注册提交
    setTimeout(() => {
      setLoading(false);
      const target = completeDemoLogin("onboarding");
      navigate(target.page, target.extra);
    }, 1500);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    color: "white", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "rgba(255,138,31,.5)");
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "rgba(255,255,255,.1)");

  return (
    <div className="auth-layout" style={{
      minHeight: "100vh", background: "#090A0E",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <AuthMotion />
      <BrandPanel navigate={navigate} />
      <div className="auth-form" style={{ flex: 1, display: "flex", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 432, padding: "16px 0" }}>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 4 }}>
          创建账号
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.4)", marginBottom: 28 }}>
          已有账号？
          <button
            onClick={() => navigate("login")}
            style={{ color: "#FF8A1F", background: "none", border: "none", fontSize: 14, cursor: "pointer" }}>
            去登录
          </button>
        </p>

        {err && (
          <p style={{ fontSize: 12.5, color: "#ef4444", marginBottom: 14,
            padding: "10px 14px", background: "rgba(239,68,68,.1)",
            borderRadius: 8, border: "1px solid rgba(239,68,68,.2)" }}>
            {err}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 账号 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
              账号 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={account}
              onChange={e => setAccount(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20))}
              placeholder="6–20位字母或数字"
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* 密码 + 确认密码 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
                密码 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  type={showPw ? "text" : "password"}
                  placeholder="8位以上"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={onFocus} onBlur={onBlur}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
                <button
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    color: "rgba(255,255,255,.3)", background: "none", border: "none",
                    cursor: "pointer", display: "flex", padding: 0,
                  }}>
                  {showPw
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye    style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
                确认密码 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  value={pw2}
                  onChange={e => setPw2(e.target.value)}
                  type={showPw2 ? "text" : "password"}
                  placeholder="再次输入"
                  style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={onFocus} onBlur={onBlur}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
                <button
                  onClick={() => setShowPw2(!showPw2)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    color: "rgba(255,255,255,.3)", background: "none", border: "none",
                    cursor: "pointer", display: "flex", padding: 0,
                  }}>
                  {showPw2
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye    style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>
          </div>

          {/* 手机号 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
              手机号 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="请输入手机号"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={onFocus} onBlur={onBlur}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
              <button
                disabled={countdown > 0}
                onClick={sendSms}
                className="glass-btn"
                style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 10, fontSize: 13,
                  color: "rgba(255,255,255,.65)", opacity: countdown > 0 ? 0.4 : 1,
                  border: "none", cursor: countdown > 0 ? "not-allowed" : "pointer",
                }}>
                {countdown > 0 ? `${countdown}s` : "获取验证码"}
              </button>
            </div>
          </div>

          {/* 短信验证码 */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.6)", display: "block", marginBottom: 6 }}>
              验证码 <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={smsCode}
                onChange={e => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="短信验证码"
                style={{ ...inputStyle, flex: 1, letterSpacing: "0.3em", fontFamily: "monospace", fontSize: 16, textAlign: "center" }}
                onFocus={onFocus} onBlur={onBlur}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
              {/* 图形验证码（Make 中的 A8K2 样式） */}
              <div
                className="glass-btn"
                style={{
                  flexShrink: 0, width: 88, height: 40, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  cursor: "pointer",
                }}
                onClick={() => {/* 演示：刷新图形验证码 */}}
                title="点击刷新">
                <span style={{ color: "white", fontSize: 14, fontWeight: 500, letterSpacing: "0.1em" }}>A8K2</span>
                <RefreshCw style={{ width: 12, height: 12, color: "rgba(255,255,255,.3)" }} />
              </div>
            </div>
          </div>

          {/* 注册按钮 */}
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="orange-btn"
            style={{
              width: "100%", height: 46, borderRadius: 13, fontSize: 15, fontWeight: 700,
              color: "black", opacity: loading ? 0.4 : 1,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {loading && <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />}
            {loading ? "注册中…" : "注册并登录"}
          </button>

          {/* 邀请码（选填） */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.4)", display: "block", marginBottom: 6 }}>
              邀请码 <span style={{ fontSize: 11, color: "rgba(255,255,255,.22)", fontWeight: 400 }}>（选填）</span>
            </label>
            <input
              placeholder="填写邀请码可获得额外奖励"
              style={inputStyle}
              onFocus={onFocus} onBlur={onBlur}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
            />
          </div>

        </div>
      </div>
      </div>
    </div>
  );
}

export default RegisterPage;
