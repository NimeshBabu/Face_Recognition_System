import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, loadAuthSession } from "../lib/authStorage";

const roleToDashboardPath = {
  user: "/user/dashboard",
  police: "/police/dashboard",
  admin: "/admin/dashboard",
} as const;

export default function HomePage() {
  const navigate = useNavigate();
  const session = loadAuthSession();

  const onLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Face Recognition System</p>
        <h1>Missing Person Platform</h1>
        <p className="hero-copy">
          Unified portal for citizen reporting, police matching, and admin
          monitoring.
        </p>

        <div className="hero-actions">
          <Link to="/user/auth" className="button primary">
            User Access
          </Link>
          <Link to="/police/auth" className="button secondary">
            Police Access
          </Link>
          <Link to="/admin/auth" className="button ghost">
            Admin Access
          </Link>
        </div>

        {session ? (
          <div className="session-row">
            <span>
              Signed in as <strong>{session.role}</strong>
            </span>
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate(roleToDashboardPath[session.role])}
            >
              Open Dashboard
            </button>
            <button type="button" className="button ghost" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
