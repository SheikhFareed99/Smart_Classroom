import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../lib/api";

/**
 * Handles the Google OAuth callback redirect.
 *
 * The backend redirects here with a short-lived one-time token:
 *   /auth/callback?token=<hex>
 *
 * We POST the token to the backend which:
 *   1. Validates it (60s TTL, single-use)
 *   2. Calls req.login() to create a session
 *   3. Returns the user object
 *
 * The session cookie is set in response to THIS direct fetch, not in the
 * OAuth redirect chain — this bypasses Safari ITP / Edge cross-site cookie blocking.
 */
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("Google sign-in failed. Please try again.");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    apiFetch("/auth/exchange-oauth-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any).message || "Token exchange failed");
        }
        // Session is now set — refresh user in context
        await refreshUser();
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        console.error("OAuth token exchange error:", err);
        setError("Sign-in failed. Please try again.");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      });
  }, []); // run once on mount

  if (error) {
    return (
      <main style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
        <p>{error}</p>
        <p style={{ color: "#64748b", fontSize: "14px" }}>Redirecting to login...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
      <p>Signing you in...</p>
    </main>
  );
}
