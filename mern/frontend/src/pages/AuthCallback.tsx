import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";



export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokenAndUser } = useAuth();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    const jwt = searchParams.get("jwt");
    const error = searchParams.get("error");

    if (error || !jwt) {
      setStatus("Sign-in failed — redirecting...");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
      return;
    }

    try {
      // Decode JWT payload (base64) — no crypto needed, just reading the user info
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      const userData = { _id: payload.userId, name: payload.name, email: payload.email };

      setTokenAndUser(jwt, userData);
      navigate("/dashboard", { replace: true });
    } catch {
      setStatus("Sign-in failed — redirecting...");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ padding: "40px", textAlign: "center", color: "#64748b", fontFamily: "sans-serif" }}>
      <p>{status}</p>
    </main>
  );
}
