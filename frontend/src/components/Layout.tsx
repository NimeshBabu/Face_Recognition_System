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
            <img src="/glass.svg" alt="Pahichan Logo" className="logo-icon" />
            <span className="logo-text">Pahichan</span>
          </Link>

          <button
            className="menu-toggle"
            onClick={() =>
              document
                .querySelector(".header-nav")
                ?.classList.toggle("nav-open")
            }
          >
            ☰
          </button>

          <nav className="header-nav">
            {showAuthButtons && (
              <>
                <a href="#features">Features</a>
                <a href="#ai-matching">AI Matching</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#security">Security</a>
              </>
            )}
            {showAuthButtons && session && <span className="nav-separator">|</span>}
            {session ? (
              <div className="auth-buttons">
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
              </div>
            ) : showAuthButtons ? (
              <div className="auth-buttons">
                <Link to="/user/auth" className="button ghost small">
                  Login
                </Link>

                <Link
                  to="/user/auth?mode=register"
                  className="button primary small"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <Link to="/home" className="button ghost small">
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
              <Link to="/home" className="logo">
                <img src="/glass.svg" alt="Pahichan Logo" className="logo-icon" />
                <span className="logo-text">Pahichan</span>
              </Link>
              <p className="footer-tagline">Pahichan is a AI-powered missing-person reporting platform with role-based dashboards and AI face matching. Citizens report missing people, police process assigned cases and found-person matches, and admins manage the system. </p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Quick Links</h4>
                <Link to="/user/auth">User Login</Link>
                <Link to="/police/auth">Police Portal</Link>
                <Link to="/admin/auth">Admin Portal </Link>
              </div>
              <div className="footer-column">
                <h4>Platform</h4>
                <a href="#features">Features</a>
                <a href="#ai-matching">AI Matching</a>
                <a href="#how-it-works">How It Works</a>
                <a href="#security">Security</a>
              </div>
              <div className="footer-column footer-connect">
                <h4>Connect</h4>
                <a
                  href="https://www.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-link-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </span>
                  <span>Facebook</span>
                </a>

                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-link-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <path d="M16 11.37a4 4 0 1 1-4.63-4.63 4 4 0 0 1 4.63 4.63z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </span>
                  <span>Instagram</span>
                </a>

                <a
                  href="https://maps.app.goo.gl/AfumQxywVEUdcgYQ6"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="footer-link-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>Gatthaghar, Bhaktapur, Nepal</span>
                </a>
                <a href="mailto:support@pahichan.com">
                  <span className="footer-link-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16v16H4z" />
                      <path d="m4 7 8 6 8-6" />
                    </svg>
                  </span>
                  <span>support@pahichan.com</span>
                </a>
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