import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiZap,
} from "react-icons/fi";

import { signIn, getSession } from "../nhost";

import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const existingSession = getSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * If the user is already authenticated,
   * don't show the login page again.
   */
  if (existingSession) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signIn(email, password);

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Login failed:", error);

      setError(
        error.message ||
          "Unable to sign in. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      <div className="login-brand">
        <div className="login-brand-icon">
          <FiZap />
        </div>

        <span>FlowForge</span>
      </div>

      <div className="login-container">

        <div className="login-card">

          <div className="login-header">

            <div className="login-icon">
              <FiShield />
            </div>

            <h1>Welcome back</h1>

            <p>
              Sign in to manage your AI workflows
              and automation.
            </p>

          </div>

          <form onSubmit={handleLogin}>

            <div className="form-group">

              <label htmlFor="email">
                Email address
              </label>

              <div className="input-wrapper">

                <FiMail />

                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                />

              </div>

            </div>

            <div className="form-group">

              <div className="password-label">

                <label htmlFor="password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() => {
                    alert(
                      "Password reset will be connected next."
                    );
                  }}
                >
                  Forgot password?
                </button>

              </div>

              <div className="input-wrapper">

                <FiLock />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="input-action"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>

              </div>

            </div>

            {error && (
              <div className="login-error">
                <FiShield />

                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <FiArrowRight />
                </>
              )}
            </button>

          </form>

          <div className="login-footer">

            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              onClick={() =>
                alert(
                  "Account creation will be connected next."
                )
              }
            >
              Create account
            </button>

          </div>

        </div>

        <p className="login-security">
          <FiShield />
          Secure authentication powered by Nhost
        </p>

      </div>

    </div>
  );
}

export default Login;
