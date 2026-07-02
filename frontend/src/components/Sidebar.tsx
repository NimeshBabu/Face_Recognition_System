import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession } from "../lib/authStorage";

interface SidebarProps {
  role: "user" | "police" | "admin";
  onTabChange?: (tab: string) => void;
  activeTab?: string;
  userName?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

type IconName =
  | "grid"
  | "edit"
  | "user"
  | "file"
  | "scan"
  | "users"
  | "home"
  | "activity"
  | "logout";

const roleLabel = {
  user: "Citizen",
  police: "Police",
  admin: "Admin",
} as const;

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "U";
}

function navItemsForRole(role: SidebarProps["role"]): NavItem[] {
  if (role === "user") {
    return [
      { id: "overview", label: "Overview", icon: "grid" },
      { id: "report", label: "Report Missing", icon: "edit" },
      { id: "profile", label: "Profile", icon: "user" },
    ];
  }

  if (role === "police") {
    return [
      { id: "overview", label: "Dashboard", icon: "grid" },
      { id: "cases", label: "Assigned Cases", icon: "file" },
      { id: "matches", label: "AI Matches", icon: "scan" },
      { id: "profile", label: "Profile", icon: "user" },
    ];
  }

  return [
    { id: "overview", label: "Dashboard", icon: "grid" },
    { id: "cases", label: "All Cases", icon: "file" },
    { id: "users", label: "Users", icon: "users" },
    { id: "stations", label: "Stations", icon: "home" },
    { id: "activity", label: "Activity", icon: "activity" },
  ];
}

function Icon({ name }: { name: IconName }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "edit":
      return (
        <svg {...commonProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "user":
      return (
        <svg {...commonProps}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "file":
      return (
        <svg {...commonProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "scan":
      return (
        <svg {...commonProps}>
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.8" />
          <path d="M16 3.2a4 4 0 0 1 0 7.6" />
        </svg>
      );
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
        </svg>
      );
    case "activity":
      return (
        <svg {...commonProps}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
  }
}

export default function Sidebar({
  role,
  onTabChange,
  activeTab,
  userName = "User",
}: SidebarProps) {
  const navigate = useNavigate();
  const initials = getInitials(userName);

  const logout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand" aria-label="Pahichan home">
          <span className="brand-mark">
            <img src="/glass.svg" alt="Pahichan Logo"/>
          </span>
          <span>Pahichan</span>
        </Link>

        <div className="sidebar-profile">
          <div className="sidebar-avatar" aria-hidden="true">
            {initials}
          </div>
          <div>
            <strong>{userName}</strong>
            <span>{roleLabel[role]} portal</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Dashboard navigation">
        <p className="eyebrow">Workspace</p>
        {navItemsForRole(role).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeTab === item.id ? "active" : ""}`}
            onClick={() => onTabChange?.(item.id)}
          >
            <span className="sidebar-link-icon">
              <Icon name={item.icon} />
            </span>
            <span className="sidebar-link-label">{item.label}</span>
            {activeTab === item.id ? <span className="sidebar-active-dot" /> : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-link danger" onClick={logout}>
          <span className="sidebar-link-icon">
            <Icon name="logout" />
          </span>
          <span className="sidebar-link-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
