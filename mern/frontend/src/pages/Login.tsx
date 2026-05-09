import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";
import { Eye, EyeOff } from "lucide-react";
import Icon from "../components/ui/Icon";

type Tab = "signin" | "signup";

function Login() {
  const [tab, setTab] = useState<Tab>("signin");

  // Sign in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [showSuPass, setShowSuPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setTokenAndUser } = useAuth();

  // ── Sign In ────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setTokenAndUser(data.token, data.user);
        navigate("/dashboard");
      } else {
        setError(data.message || "Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Sign Up ────────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (suPassword !== suConfirm) {
      setError("Passwords do not match.");
      return;
    }
    if (suPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: suName, email: suEmail, password: suPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setTokenAndUser(data.token, data.user);
        navigate("/dashboard");
      } else {
        setError(data.message || "Signup failed. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ThemeToggle className="login-toggle" />

      <div className="login-page">
        <div className="login-container">

          {/* Logo */}
          <div className="login-logo">
            <div className="logo-icon">AI</div>
            <h1>AI<span>Co</span></h1>
          </div>
          <p className="login-subtitle">Your AI-powered classroom</p>

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === "signin" ? " active" : ""}`}
              onClick={() => { setTab("signin"); setError(null); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab${tab === "signup" ? " active" : ""}`}
              onClick={() => { setTab("signup"); setError(null); }}
            >
              Sign Up
            </button>
          </div>

          {/* Card */}
          <div className="login-card">

            {/* Error banner */}
            {error && <div className="auth-error">{error}</div>}

            {/* ── SIGN IN ── */}
            {tab === "signin" && (
              <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    id="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <Icon icon={showPassword ? EyeOff : Eye} size={18} />
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </button>

                <div className="login-divider"><span>or continue with</span></div>

                <button
                  type="button"
                  className="btn btn-google"
                  id="google-button"
                  onClick={() => { window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? ""}/auth/google`; }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>

                <p className="auth-switch">
                  Don't have an account?{" "}
                  <button type="button" className="auth-switch-link" onClick={() => { setTab("signup"); setError(null); }}>
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGN UP ── */}
            {tab === "signup" && (
              <form className="login-form" onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label" htmlFor="su-name">Full Name</label>
                  <input
                    className="form-input"
                    type="text"
                    id="su-name"
                    placeholder="John Smith"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="su-email">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    id="su-email"
                    placeholder="you@university.edu"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="su-password">Password</label>
                  <div className="input-wrapper">
                    <input
                      className="form-input"
                      type={showSuPass ? "text" : "password"}
                      id="su-password"
                      placeholder="At least 6 characters"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowSuPass(!showSuPass)}
                      aria-label={showSuPass ? "Hide password" : "Show password"}
                    >
                      <Icon icon={showSuPass ? EyeOff : Eye} size={18} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="su-confirm">Confirm Password</label>
                  <input
                    className="form-input"
                    type="password"
                    id="su-confirm"
                    placeholder="Repeat your password"
                    value={suConfirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating account…" : "Create Account"}
                </button>

                <div className="login-divider"><span>or</span></div>

                <button
                  type="button"
                  className="btn btn-google"
                  onClick={() => { window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? ""}/auth/google`; }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </button>

                <p className="auth-switch">
                  Already have an account?{" "}
                  <button type="button" className="auth-switch-link" onClick={() => { setTab("signin"); setError(null); }}>
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>

          <p className="login-footer">© 2026 AICo — AI Classroom Dashboard. All rights reserved.</p>
        </div>
      </div>
    </>
  );
}

export default Login;
