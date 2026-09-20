import React, { useState } from "react";
import { loginUser } from "../../services/api";

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Email or username is required.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser({
        email: email.trim(),
        password,
      });

      if (onLogin) {
        onLogin(data);
      }
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>SAFAL CRM</h1>

        <p className="sub">
          Business CRM for Perfume Manufacturers
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email / Username</label>

            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@safalcrm.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
            />
          </div>

          {error && (
            <div
              className="empty-state"
              style={{
                marginBottom: "16px",
                color: "#b91c1c",
                borderColor: "#fecaca",
                background: "#fef2f2",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="submit"
              className="btn primary"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;