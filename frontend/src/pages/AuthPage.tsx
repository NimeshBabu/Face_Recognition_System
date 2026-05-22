import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import { saveAuthSession, type UserRole } from "../lib/authStorage";
import Layout from "../components/Layout";

interface AuthPageProps {
  role: UserRole;
}

type Mode = "login" | "register" | "setup";
type AuthField = "name" | "email" | "password" | "setupKey";
type AuthFieldErrors = Partial<Record<AuthField, string>>;

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

export default function AuthPage({ role }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>(role === "user" ? "login" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const labels = useMemo(() => {
    if (role === "user") {
      return {
        title: "User Portal",
        base: API_PATHS.user,
        dashboardPath: "/user/dashboard" as const,
      };
    }
    if (role === "police") {
      return {
        title: "Police Portal",
        base: API_PATHS.police,
        dashboardPath: "/police/dashboard" as const,
      };
    }
    return {
      title: "Admin Portal",
      base: API_PATHS.admin,
      dashboardPath: "/admin/dashboard" as const,
    };
  }, [role]);

  const validate = (): AuthFieldErrors => {
    const errors: AuthFieldErrors = {};

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      errors.email = "Enter a valid email address";
    }

    if (!password.trim()) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (role === "user" && mode === "register") {
      if (!name.trim()) {
        errors.name = "Full name is required";
      }
    }

    if (role === "admin" && mode === "setup") {
      if (!setupKey.trim()) {
        errors.setupKey = "Setup key is required";
      }
    }

    return errors;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setFieldErrors(nextErrors);
    setStatus("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      if (role === "user" && mode === "register") {
        const registerRes = await api.post(`${labels.base}/register`, {
          name: name.trim(),
          email: email.trim(),
          password,
        });
        setStatus(registerRes.data?.message ?? "Registration complete");
        setMode("login");
        setLoading(false);
        return;
      }

      if (role === "admin" && mode === "setup") {
        const setupRes = await api.post(
          `${labels.base}/setup-admin`,
          { email: email.trim(), password },
          {
            headers: {
              "x-setup-key": setupKey,
            },
          },
        );
        setStatus(setupRes.data?.message ?? "Admin setup completed");
        setMode("login");
        setLoading(false);
        return;
      }

      const loginRes = await api.post(`${labels.base}/login`, {
        email: email.trim(),
        password,
      });

      const token = loginRes.data?.token as string;
      const id =
        (loginRes.data?.user_id as string | undefined) ??
        (loginRes.data?.station_id as string | undefined) ??
        (loginRes.data?.admin_id as string | undefined) ??
        "";

      saveAuthSession({
        token,
        role,
        id,
        name: loginRes.data?.name,
      });

      window.location.href = labels.dashboardPath;
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showAuthButtons={false}>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <p className="eyebrow">{labels.title}</p>
            <h2>
              {mode === "register"
                ? "Create Account"
                : mode === "setup"
                  ? "Initial Setup"
                  : "Sign In"}
            </h2>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {role === "user" && mode === "register" ? (
              <label>
                Full Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                  required
                />
                {fieldErrors.name ? (
                  <span className="field-error">{fieldErrors.name}</span>
                ) : null}
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                required
              />
              {fieldErrors.email ? (
                <span className="field-error">{fieldErrors.email}</span>
              ) : null}
            </label>

            <label>
              Password
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <span className="field-error">{fieldErrors.password}</span>
              ) : null}
            </label>

            {role === "admin" && mode === "setup" ? (
              <label>
                Setup Key (x-setup-key)
                <input
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.setupKey)}
                  required
                />
                {fieldErrors.setupKey ? (
                  <span className="field-error">{fieldErrors.setupKey}</span>
                ) : null}
              </label>
            ) : null}

            <button className="button primary" type="submit" disabled={loading}>
              {loading ? "Please wait..." : "Continue"}
            </button>
          </form>

          <div className="auth-footer">
            {role === "user" ? (
              <button
                type="button"
                className="button ghost"
                onClick={() =>
                  setMode((current) =>
                    current === "login" ? "register" : "login",
                  )
                }
              >
                {mode === "login"
                  ? "Need an account? Register"
                  : "Already registered? Login"}
              </button>
            ) : null}

            {role === "admin" ? (
              <button
                type="button"
                className="button ghost"
                onClick={() =>
                  setMode((current) => (current === "setup" ? "login" : "setup"))
                }
              >
                {mode === "setup" ? "Go to login" : "Need first-time setup?"}
              </button>
            ) : null}
          </div>

          {status ? <p className="status-text">{status}</p> : null}
        </div>
      </div>
    </Layout>
  );
}