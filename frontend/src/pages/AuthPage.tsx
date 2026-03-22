import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import { saveAuthSession, type UserRole } from "../lib/authStorage";

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
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(role === "user" ? "login" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
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

      navigate(labels.dashboardPath);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="panel narrow">
        <p className="eyebrow">{labels.title}</p>
        <h2>
          {mode === "register"
            ? "Create Account"
            : mode === "setup"
              ? "Initial Setup"
              : "Sign In"}
        </h2>

        <form className="stack" onSubmit={submit}>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              required
            />
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

        <div className="row-wrap">
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

          <Link to="/" className="button ghost">
            Back Home
          </Link>
        </div>

        {status ? <p className="status-text">{status}</p> : null}
      </section>
    </main>
  );
}
