import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

import { setAccessToken, setUser } from "../redux/slices/authSlice";

const API = import.meta.env.VITE_API_URL;

const initialResetData = {
  email: "",
  otp: "",
  newPassword: "",
  confirmPassword: "",
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetData, setResetData] = useState(initialResetData);

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const getResponse = async (response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong.");
    }

    return data;
  };

  // ADMIN LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role: "admin",
        }),
      });

      const data = await getResponse(response);

      // Extra frontend check. Backend must also enforce admin authorization.
      if (data.user?.role !== "admin") {
        throw new Error("This account is not authorized as an admin.");
      }

      dispatch(setAccessToken(data.access_token));
      dispatch(setUser(data.user));

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  };

  // REQUEST PASSWORD RESET OTP
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const normalizedEmail = resetData.email.trim().toLowerCase();

      const response = await fetch(`${API}/auth/forgot-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          role: "admin",
        }),
      });

      const data = await getResponse(response);

      setResetData((prev) => ({
        ...prev,
        email: normalizedEmail,
      }));

      setMessage(
        data.message ||
          "If the admin account exists, a password-reset OTP has been sent.",
      );

      setView("reset");
    } catch (err) {
      setError(err.message || "Could not request a password reset.");
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD USING OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (resetData.newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/reset-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: resetData.email.trim().toLowerCase(),
          role: "admin",
          otp: resetData.otp.trim(),
          newPassword: resetData.newPassword,
        }),
      });

      const data = await getResponse(response);

      setMessage(data.message || "Password reset successful. Please log in.");

      setPassword("");
      setResetData(initialResetData);
      setView("login");
    } catch (err) {
      setError(err.message || "Could not reset the password.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

  const buttonClass =
    "w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60";

  const goToLogin = () => {
    clearFeedback();
    setView("login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        {/* HEADER */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 p-2">
            <img
              src="/logo.png"
              alt="LovoPet Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            LovoPet Admin
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {view === "login"
              ? "Sign in to access the administration panel."
              : view === "forgot"
                ? "Request a password-reset OTP."
                : "Verify your OTP and create a new password."}
          </p>
        </div>

        {/* FEEDBACK */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {/* LOGIN */}
        {view === "login" && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Admin email
              </label>

              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                placeholder="admin@lovopet.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setResetData(initialResetData);
                  setResetData((prev) => ({
                    ...prev,
                    email: email.trim().toLowerCase(),
                  }));
                  setView("forgot");
                }}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? "Signing in..." : "Sign In as Admin"}
            </button>
          </form>
        )}

        {/* REQUEST OTP */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label
                htmlFor="reset-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Admin email
              </label>

              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="admin@lovopet.com"
                value={resetData.email}
                onChange={(e) =>
                  setResetData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </div>

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? "Sending OTP..." : "Send Reset OTP"}
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to login
            </button>
          </form>
        )}

        {/* VERIFY OTP AND RESET PASSWORD */}
        {view === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label
                htmlFor="otp-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Admin email
              </label>

              <input
                id="otp-email"
                type="email"
                value={resetData.email}
                onChange={(e) =>
                  setResetData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                className={inputClass}
                required
              />
            </div>

            <div>
              <label
                htmlFor="reset-otp"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                OTP
              </label>

              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter the OTP from your email"
                value={resetData.otp}
                onChange={(e) =>
                  setResetData((prev) => ({
                    ...prev,
                    otp: e.target.value,
                  }))
                }
                className={inputClass}
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Use the OTP sent to your registered admin email.
              </p>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New password
              </label>

              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={resetData.newPassword}
                  onChange={(e) =>
                    setResetData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  className={`${inputClass} pr-12`}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                >
                  {showNewPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm new password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter the new password again"
                value={resetData.confirmPassword}
                onChange={(e) =>
                  setResetData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className={inputClass}
                minLength={8}
                required
              />
            </div>

            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? "Resetting password..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={goToLogin}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to login
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-slate-100 pt-5 text-center">
          <p className="text-xs text-slate-400">
            Authorized personnel only · LovoPet
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-3 text-sm text-slate-500 hover:text-orange-600"
          >
            Return to website
          </button>
        </div>
      </div>
    </div>
  );
}
