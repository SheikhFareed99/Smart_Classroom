import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Use raw fetch — no CSRF needed, the one-time token is the security mechanism.
    // Also avoids the apiFetch CSRF pre-flight that would fail before a session exists.
    fetch(`${API}/auth/exchange-oauth-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).message || `HTTP ${res.status}`);
        }
        await refreshUser();
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        console.error("OAuth exchange failed:", err.message);
        setStatus("Sign-in failed — redirecting...");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ padding: "40px", textAlign: "center", color: "#64748b", fontFamily: "sans-serif" }}>
      <p>{status}</p>
    </main>
  );
}
