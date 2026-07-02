import { useState, useEffect, useRef, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import { api, API_PATHS } from "../lib/api";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: any;
  type?: string;
  case_id?: string;
  log_id?: string;
  found_case_id?: string;
  photo_url?: string;
}

interface DashboardLayoutProps {
  role: "user" | "police" | "admin";
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userName?: string;
  searchTerm?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onNotificationClick?: (notif: Notification) => void;
}

const TOAST_LIFETIME_MS = 6000;

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

function getRelativeTime(value: any) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type NotifTone = "blue" | "green" | "red" | "gray";

function getTypeMeta(type?: string): { tone: NotifTone; icon: "scan" | "check" | "x" | "bell" } {
  switch (type) {
    case "match_suggestion":
    case "match_suggestion_bulk":
      return { tone: "blue", icon: "scan" };
    case "match_confirmed_by_owner":
    case "case_found":
      return { tone: "green", icon: "check" };
    case "match_ruled_out":
      return { tone: "red", icon: "x" };
    default:
      return { tone: "gray", icon: "bell" };
  }
}

const TONE_COLORS: Record<NotifTone, { fg: string; bg: string }> = {
  blue: { fg: "#3b82f6", bg: "rgba(59, 130, 246, 0.14)" },
  green: { fg: "#16a34a", bg: "rgba(22, 163, 74, 0.14)" },
  red: { fg: "#ef4444", bg: "rgba(239, 68, 68, 0.14)" },
  gray: { fg: "#6b7280", bg: "rgba(107, 114, 128, 0.14)" },
};

function NotifTypeIcon({ icon }: { icon: "scan" | "check" | "x" | "bell" }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "scan":
      return (
        <svg {...common}>
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M7 12h10" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "bell":
    default:
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
}

function NotifAvatar({ notif }: { notif: Notification }) {
  const meta = getTypeMeta(notif.type);
  const colors = TONE_COLORS[meta.tone];

  return (
    <div style={{ position: "relative", flexShrink: 0, width: "40px", height: "40px" }}>
      {notif.photo_url ? (
        <img
          src={notif.photo_url}
          alt=""
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            objectFit: "cover",
            border: "1px solid var(--border)",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: colors.bg,
            color: colors.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NotifTypeIcon icon={meta.icon} />
        </div>
      )}
      {notif.photo_url ? (
        <span
          style={{
            position: "absolute",
            bottom: "-4px",
            right: "-4px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: colors.fg,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--card, #fff)",
          }}
        >
          <span style={{ transform: "scale(0.65)", display: "flex" }}>
            <NotifTypeIcon icon={meta.icon} />
          </span>
        </span>
      ) : null}
    </div>
  );
}

function NotificationToastItem({
  toast,
  onDismiss,
  onOpen,
}: {
  toast: Notification;
  onDismiss: (id: string) => void;
  onOpen: (notif: Notification) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), TOAST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      onClick={() => {
        onOpen(toast);
        onDismiss(toast.id);
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "320px",
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        padding: "14px",
        borderRadius: "12px",
        background: "var(--card, #fff)",
        color: "var(--card-foreground, #000)",
        border: "1px solid var(--border, #ccc)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        cursor: "pointer",
        animation: "notifToastIn 0.28s ease-out",
      }}
    >
      <NotifAvatar notif={toast} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, lineHeight: 1.4 }}>
          {toast.message}
        </p>
        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {getRelativeTime(toast.created_at) || "Just now"}
        </span>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--muted-foreground)",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px",
        }}
      >
        ×
      </button>
      <span
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          background: TONE_COLORS[getTypeMeta(toast.type).tone].fg,
          animation: `notifToastShrink ${TOAST_LIFETIME_MS}ms linear forwards`,
        }}
      />
    </div>
  );
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
  onNotificationClick,
}: DashboardLayoutProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchNotifications = async () => {
    if (role !== "user" && role !== "police") return;
    try {
      const endpoint = role === "user"
        ? `${API_PATHS.user}/notifications`
        : `${API_PATHS.police}/notifications`;
      const res = await api.get(endpoint);
      const fetched: Notification[] = res.data.notifications || [];

      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
      } else {
        const freshUnseen = fetched.filter(
          (n) => !n.read && !seenIdsRef.current.has(n.id),
        );
        if (freshUnseen.length > 0) {
          setToasts((prev) => [...prev, ...freshUnseen]);
        }
      }

      seenIdsRef.current = new Set(fetched.map((n) => n.id));
      setNotifications(fetched);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [role]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const endpoint = role === "user"
        ? `${API_PATHS.user}/notifications/${id}/read`
        : `${API_PATHS.police}/notifications/${id}/read`;
      await api.post(endpoint);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openNotification = (notif: Notification) => {
    if (!notif.read) handleMarkAsRead(notif.id);
    onNotificationClick?.(notif);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="dashboard-layout">
      <style>{`
        @keyframes notifToastIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes notifToastShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .notif-item {
          transition: background 0.15s ease, opacity 0.15s ease;
        }
        .notif-item:hover {
          background: var(--accent-tint, rgba(59, 130, 246, 0.08)) !important;
        }
      `}</style>

      {/* Toast stack */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {toasts.map((toast) => (
          <NotificationToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onOpen={openNotification}
          />
        ))}
      </div>

      <Sidebar
        role={role}
        activeTab={activeTab}
        onTabChange={onTabChange}
        userName={userName}
      />

      <main className="dashboard-main">
        <header className="dashboard-topbar-modern">
          <label className="topbar-search">
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

          <div className="topbar-user" style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              className={`icon-button ${unreadCount > 0 ? "has-unread" : ""}`}
              aria-label="Notifications"
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ position: "relative" }}
            >
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
              {unreadCount > 0 && (
                <span
                  className="notification-badge"
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    background: "var(--accent-red, #ef4444)",
                    color: "white",
                    borderRadius: "50%",
                    padding: "2px 6px",
                    fontSize: "10px",
                    fontWeight: "bold"
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div
                className="notifications-dropdown shadow-lg border border-border bg-card text-card-foreground rounded-lg"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: "0",
                  marginTop: "8px",
                  width: "340px",
                  maxHeight: "420px",
                  overflowY: "auto",
                  zIndex: 1000,
                  padding: "10px",
                  background: "var(--card, #fff)",
                  color: "var(--card-foreground, #000)",
                  border: "1px solid var(--border, #ccc)",
                  borderRadius: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "4px 6px 12px", borderBottom: "1px solid var(--border)" }}>
                  <h4 style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>Notifications</h4>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: TONE_COLORS.blue.fg,
                        background: TONE_COLORS.blue.bg,
                        padding: "2px 8px",
                        borderRadius: "999px",
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px 0", color: "var(--muted-foreground)" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px", opacity: 0.5 }}>
                      <NotifTypeIcon icon="bell" />
                    </div>
                    <p style={{ fontSize: "13px", margin: 0 }}>No notifications yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="notif-item"
                        onClick={() => {
                          openNotification(notif);
                          setShowDropdown(false);
                        }}
                        style={{
                          position: "relative",
                          padding: "10px 8px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                          opacity: notif.read ? 0.6 : 1,
                        }}
                      >
                        <NotifAvatar notif={notif} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "13px",
                              lineHeight: 1.4,
                              fontWeight: notif.read ? 400 : 600,
                              color: "var(--foreground)",
                            }}
                          >
                            {notif.message}
                          </p>
                          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                            {getRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        {!notif.read ? (
                          <span
                            style={{
                              position: "absolute",
                              top: "12px",
                              right: "8px",
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: TONE_COLORS.blue.fg,
                            }}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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