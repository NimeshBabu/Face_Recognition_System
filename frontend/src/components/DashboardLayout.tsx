import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  role: "user" | "police" | "admin";
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userName?: string;
  searchTerm?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
}

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

export default function DashboardLayout({
  role,
  children,
  activeTab,
  onTabChange,
  userName = "User",
  searchTerm = "",
  searchPlaceholder = "Search cases...",
  onSearchChange,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar
        role={role}
        activeTab={activeTab}
        onTabChange={onTabChange}
        userName={userName}
      />

      <main className="dashboard-main">
        <header className="dashboard-topbar-modern">
          <label className="topbar-search">
            <span className="sr-only">{searchPlaceholder}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
          </label>

          <div className="topbar-user">
            <button type="button" className="icon-button" aria-label="Notifications">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            <div className="topbar-profile">
              <span className="topbar-name">{userName}</span>
              <span className="avatar" aria-hidden="true">
                {getInitials(userName)}
              </span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
