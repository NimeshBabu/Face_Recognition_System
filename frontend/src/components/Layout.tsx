import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { clearAuthSession, loadAuthSession } from "../lib/authStorage";

const roleToDashboardPath = {
  user: "/user/dashboard",
  police: "/police/dashboard",
  admin: "/admin/dashboard",
} as const;

interface LayoutProps {
  children: React.ReactNode;
  showAuthButtons?: boolean;
}

export default function Layout({ children, showAuthButtons = true }: LayoutProps) {
  const location = useLocation();
  const session = loadAuthSession();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a[href^='#']");
      if (anchor) {
        e.preventDefault();
        const id = anchor.getAttribute("href")?.slice(1);
        if (id) {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-container">
          <Link to="/home" className="logo">
            <span className="logo-icon">🔎</span>
            <span className="logo-text">Pahichan</span>
          </Link>
          <nav className="header-nav">
            {showAuthButtons && (
              <>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
              </>
            )}
            {showAuthButtons && session && <span className="nav-separator">|</span>}
            {session ? (
              <>
                <span className="session-badge">
                  Signed in as <strong>{session.role}</strong>
                </span>
                <Link
                  to={roleToDashboardPath[session.role]}
                  className="button secondary small"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => {
                    clearAuthSession();
                    window.location.href = "/";
                  }}
                >
                  Logout
                </button>
              </>
            ) : showAuthButtons ? (
              <Link to="/user/auth" className="button primary small">
                Login
              </Link>
            ) : (
              <Link to="/" className="button ghost small">
                Back to Home
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand">
              <Link to="/" className="logo">
                <span className="logo-icon">🔎</span>
                <span className="logo-text">Pahichan</span>
              </Link>
              <p className="footer-tagline">AI-Powered Missing Person Platform</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Quick Links</h4>
                <Link to="/user/auth">User Login</Link>
                <Link to="/police/auth">Police Portal</Link>
                <Link to="/admin/auth">Admin Portal</Link>
              </div>
              <div className="footer-column">
                <h4>Platform</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How It Works</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Pahichan. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}