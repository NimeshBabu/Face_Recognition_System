import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, type UserRole } from "../lib/authStorage";

interface DashboardTopBarProps {
  role: UserRole;
  title: string;
  subtitle?: string;
}

export default function DashboardTopBar({
  role,
  title,
  subtitle,
}: DashboardTopBarProps) {
  const navigate = useNavigate();

  const onLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <header className="dashboard-topbar">
      <div>
        <p className="eyebrow">{role} portal</p>
        <h1 className="dashboard-title">{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>

      <div className="row-wrap topbar-actions">
        <Link to="/" className="button ghost">
          Home
        </Link>
        <button type="button" className="button secondary" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
