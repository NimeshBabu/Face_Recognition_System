import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import { loadAuthSession } from "../lib/authStorage";
import { useStatusDismiss } from "../lib/useStatusDismiss";
import DashboardLayout from "../components/DashboardLayout";

interface AdminCase {
  case_id: string;
  name?: string;
  age?: number;
  status?: string;
  police_station_id?: string;
  created_at?: DateValue;
}

interface SimpleUser {
  user_id: string;
  name?: string;
  email?: string;
  role?: string;
  created_at?: DateValue;
}

interface PoliceStation {
  station_id: string;
  station_name?: string;
  email?: string;
  location?: string;
  created_at?: DateValue;
}

interface StationFormState {
  stationName: string;
  stationEmail: string;
  stationPassword: string;
  stationLocation: string;
}

type AdminTab = "overview" | "cases" | "users" | "stations" | "activity";
type DateValue =
  | string
  | number
  | {
    _seconds?: number;
    seconds?: number;
    nanoseconds?: number;
  };
type IconName =
  | "activity"
  | "building"
  | "check"
  | "clock"
  | "file"
  | "plus"
  | "refresh"
  | "shield"
  | "trash"
  | "users";

const emptyStationForm: StationFormState = {
  stationName: "",
  stationEmail: "",
  stationPassword: "",
  stationLocation: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

function normalizeStatus(status?: string) {
  return (status ?? "unknown").toLowerCase().replace(/\s+/g, "-");
}

function formatDate(value?: DateValue) {
  if (!value) {
    return "Not available";
  }

  let date: Date;

  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (!seconds) {
      return "Not available";
    }
    date = new Date(seconds * 1000);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Icon({ name }: { name: IconName }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "activity":
      return (
        <svg {...commonProps}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case "building":
      return (
        <svg {...commonProps}>
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-4" />
          <path d="M9 9v.01" />
          <path d="M9 13v.01" />
          <path d="M9 17v.01" />
        </svg>
      );
    case "check":
      return (
        <svg {...commonProps}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "file":
      return (
        <svg {...commonProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
      );
    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      );
    case "trash":
      return (
        <svg {...commonProps}>
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
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
    default:
      return null;
  }
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
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
      <path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9" />
      <path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2" />
      <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: IconName;
  tone: "teal" | "amber" | "blue" | "rose";
}) {
  return (
    <article className="stat-card-modern admin-stat-card">
      <span className={`stat-icon ${tone}`}>
        <Icon name={icon} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-header admin-section-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span className={`status-badge ${normalizeStatus(status)}`}>
      {status ?? "unknown"}
    </span>
  );
}

function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-bar">
      <span className="muted pagination-info">
        Showing {startItem}–{endItem} of {totalItems}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="button ghost small"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="pagination-page">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          className="button ghost small"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}


function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state empty-panel">{children}</div>;
}

function PasswordField({
  value,
  visible,
  onChange,
  onToggle,
}: {
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <label className="form-group">
      <span>Password</span>
      <div className="password-wrapper">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Create station password"
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <PasswordEyeIcon visible={visible} />
        </button>
      </div>
    </label>
  );
}

const PAGE_SIZE = 10;
function CaseTable({
  cases,
  stationNames,
  onDelete,
  searchQuery,
  currentPage,
  onPageChange,
}: {
  cases: AdminCase[];
  stationNames: Map<string, string>;
  onDelete: (caseId: string) => void;
  searchQuery: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const paginatedCases = cases.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  return (
    <div className="data-table-wrapper admin-table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Name</th>
            <th>Age</th>
            <th>Status</th>
            <th>Station</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginatedCases.map((item) => (
            <tr key={item.case_id}>
              <td className="mono">PH-{item.case_id.substring(0, 5).toUpperCase()}</td>
              <td>{item.name ?? "Unnamed"}</td>
              <td>{item.age ?? "N/A"}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>
                {item.police_station_id
                  ? stationNames.get(item.police_station_id) ??
                  `PS-${item.police_station_id.substring(0, 5).toUpperCase()}`
                  : "Unassigned"}
              </td>
              <td>
                <button
                  type="button"
                  className="danger icon-button"
                  onClick={() => onDelete(item.case_id)}
                  aria-label={`Delete case ${item.case_id}`}
                >
                  <Icon name="trash" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cases.length === 0 ? (
        <EmptyState>
          {searchQuery ? "No cases match your search." : "No cases found."}
        </EmptyState>
      ) : null}
      <Pagination
        currentPage={currentPage}
        totalItems={cases.length}
        pageSize={PAGE_SIZE}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function UsersTable({
  users,
  searchQuery,
  currentPage,
  onPageChange,
  onDelete,
}: {
  users: SimpleUser[];
  searchQuery: string;
  currentPage: number;
  onPageChange: (page: number) => void
  onDelete: (userId: string) => void
}) {
  const paginatedUsers = users.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  return (
    <div className="data-table-wrapper admin-table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {paginatedUsers.map((item) => (
            <tr key={item.user_id}>
              <td className="mono">USR-{item.user_id.substring(0, 5).toUpperCase()}</td>
              <td>{item.name ?? "N/A"}</td>
              <td>{item.email ?? "N/A"}</td>
              <td>
                <span className={`role-badge ${item.role ?? "user"}`}>
                  {item.role ?? "user"}
                </span>
              </td>
              <td className="muted">{formatDate(item.created_at)}</td>
              <td>
                {item.role !== "admin" ? (
                  <button
                    type="button"
                    className="danger icon-button"
                    onClick={() => onDelete(item.user_id)}
                    aria-label={`Delete user ${item.user_id}`}
                  >
                    <Icon name="trash" />
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: "12px" }}>Protected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 ? (
        <EmptyState>
          {searchQuery ? "No users match your search." : "No users found."}
        </EmptyState>
      ) : null}
      <Pagination
        currentPage={currentPage}
        totalItems={users.length}
        pageSize={PAGE_SIZE}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function StationCard({
  station,
  assignedCases,
  onDelete,
}: {
  station: PoliceStation;
  assignedCases: number;
  onDelete: (stationId: string) => void;
}) {
  return (
    <article className="admin-station-card">
      <div className="station-card-header">
        <div className="station-avatar large">
          <Icon name="building" />
        </div>
        <div>
          <h3>{station.station_name ?? "Unnamed Station"}</h3>
          <p className="muted">{station.location || "No location added"}</p>
        </div>
        <button
          type="button"
          className="danger icon-button"
          onClick={() => onDelete(station.station_id)}
          aria-label={`Delete station ${station.station_name ?? station.station_id}`}
          style={{ marginLeft: "auto" }}
        >
          <Icon name="trash" />
        </button>
      </div>

      <dl className="station-facts">
        <div>
          <dt>Email</dt>
          <dd>{station.email ?? "N/A"}</dd>
        </div>
        <div>
          <dt>Cases</dt>
          <dd>{assignedCases}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(station.created_at)}</dd>
        </div>
      </dl>
    </article>
  );
}

function CreateStationForm({
  value,
  passwordVisible,
  loading,
  onChange,
  onPasswordToggle,
  onSubmit,
}: {
  value: StationFormState;
  passwordVisible: boolean;
  loading: boolean;
  onChange: (nextValue: StationFormState) => void;
  onPasswordToggle: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [touched, setTouched] = useState(false);

  const passwordError =
    value.stationPassword.length > 0 && value.stationPassword.length < 8
      ? "Password must be at least 8 characters"
      : "";

  const emailError =
    value.stationEmail.length > 0 &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.stationEmail)
      ? "Enter a valid email address"
      : "";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);

    if (!value.stationName.trim()) return;
    if (emailError || !value.stationEmail.trim()) return;
    if (value.stationPassword.length < 8) return;

    onSubmit(event);
  };

  return (
    <form className="admin-create-form" onSubmit={handleSubmit} noValidate>
      <label className="form-group">
        <span>Station Name</span>
        <input
          value={value.stationName}
          onChange={(event) => onChange({ ...value, stationName: event.target.value })}
          placeholder="Enter station name"
          aria-invalid={touched && !value.stationName.trim()}
        />
        {touched && !value.stationName.trim() ? (
          <span className="field-error" role="alert">Station name is required</span>
        ) : null}
      </label>

      <label className="form-group">
        <span>Email</span>
        <input
          type="email"
          value={value.stationEmail}
          onChange={(event) => onChange({ ...value, stationEmail: event.target.value })}
          placeholder="station@example.com"
          aria-invalid={Boolean(emailError) || (touched && !value.stationEmail.trim())}
        />
        {emailError ? (
          <span className="field-error" role="alert">{emailError}</span>
        ) : touched && !value.stationEmail.trim() ? (
          <span className="field-error" role="alert">Email is required</span>
        ) : null}
      </label>

      <PasswordField
        value={value.stationPassword}
        visible={passwordVisible}
        onChange={(stationPassword) => onChange({ ...value, stationPassword })}
        onToggle={onPasswordToggle}
      />
      {passwordError ? (
        <span className="field-error" role="alert">{passwordError}</span>
      ) : touched && !value.stationPassword ? (
        <span className="field-error" role="alert">Password is required</span>
      ) : null}

      <label className="form-group">
        <span>Location</span>
        <input
          value={value.stationLocation}
          onChange={(event) => onChange({ ...value, stationLocation: event.target.value })}
          placeholder="Enter location"
        />
      </label>

      <button className="modern-btn primary" type="submit" disabled={loading}>
        <Icon name="plus" />
        {loading ? "Creating..." : "Create Station"}
      </button>
    </form>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [creatingStation, setCreatingStation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [caseFilter, setCaseFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stationForm, setStationForm] = useState<StationFormState>(emptyStationForm);

  const adminName = loadAuthSession()?.name ?? "Admin";
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeletingCase, setIsDeletingCase] = useState(false);

  const [casePage, setCasePage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [stationFormKey, setStationFormKey] = useState(0);


  const query = searchQuery.trim().toLowerCase();

  // Reset to page 1 whenever filters/search change so you don't get stuck on an empty page
  useEffect(() => {
    setCasePage(1);
  }, [caseFilter, query]);

  useEffect(() => {
    setUserPage(1);
  }, [query])

  const [stationToDelete, setStationToDelete] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeletingStation, setIsDeletingStation] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const requestDeleteStation = (stationId: string) => setStationToDelete(stationId);
  const cancelDeleteStation = () => setStationToDelete(null);

  const confirmDeleteStation = async () => {
    if (!stationToDelete) return;
    setIsDeletingStation(true);
    try {
      const response = await api.delete(`${API_PATHS.admin}/police/${stationToDelete}`);
      setStatus(response.data?.message ?? "Station deleted");
      setStatusKind("success");
      await loadData();
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setIsDeletingStation(false);
      setStationToDelete(null);
    }
  };

  const requestDeleteUser = (userId: string) => setUserToDelete(userId);
  const cancelDeleteUser = () => setUserToDelete(null);

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const response = await api.delete(`${API_PATHS.admin}/users/${userToDelete}`);
      setStatus(response.data?.message ?? "User deleted");
      setStatusKind("success");
      await loadData();
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };


  // Auto-dismiss status banner after 4 seconds
  useStatusDismiss(status, setStatus);

  const loadData = async () => {
    setLoading(true);
    try {
      const [caseRes, userRes, stationRes] = await Promise.all([
        api.get(`${API_PATHS.admin}/all-cases`),
        api.get(`${API_PATHS.admin}/users`),
        api.get(`${API_PATHS.admin}/police`),
      ]);

      setCases(caseRes.data?.cases ?? []);
      setUsers(userRes.data?.users ?? []);
      setStations(stationRes.data?.police_stations ?? []);
      setStatus("");
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const activityTimeline = useMemo(() => {
    interface TimelineEvent {
      id: string;
      type: "case" | "user" | "station";
      title: string;
      description: string;
      date: DateValue | undefined;
    }
    const events: TimelineEvent[] = [];

    cases.forEach((item) => {
      events.push({
        id: `case-${item.case_id}`,
        type: "case",
        title: "Missing Person Reported",
        description: `A new case PH-${item.case_id.substring(0, 5).toUpperCase()} was created for "${item.name || "Unnamed"}".`,
        date: item.created_at,
      });
    });

    users.forEach((item) => {
      events.push({
        id: `user-${item.user_id}`,
        type: "user",
        title: `Citizen Registered`,
        description: `User "${item.name || "Unnamed"}" (${item.email || "N/A"}) joined the platform.`,
        date: item.created_at,
      });
    });

    stations.forEach((item) => {
      events.push({
        id: `station-${item.station_id}`,
        type: "station",
        title: "Police Station Registered",
        description: `Station "${item.station_name || "Unnamed Station"}" in "${item.location || "N/A"}" was added.`,
        date: item.created_at,
      });
    });

    return events.sort((a, b) => {
      const getTimestamp = (val: DateValue | undefined) => {
        if (!val) return 0;
        if (typeof val === "object") {
          const sec = val.seconds ?? val._seconds;
          return sec ? sec * 1000 : 0;
        }
        return new Date(val).getTime();
      };
      return getTimestamp(b.date) - getTimestamp(a.date);
    });
  }, [cases, users, stations]);

  const stationNames = useMemo(() => {
    const lookup = new Map<string, string>();
    stations.forEach((station) => {
      lookup.set(station.station_id, station.station_name ?? "Unnamed Station");
    });
    return lookup;
  }, [stations]);

  const stationCaseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    cases.forEach((item) => {
      if (item.police_station_id) {
        counts.set(
          item.police_station_id,
          (counts.get(item.police_station_id) ?? 0) + 1,
        );
      }
    });
    return counts;
  }, [cases]);

  const stats = useMemo(() => {
    const activeCases = cases.filter(
      (item) => normalizeStatus(item.status) === "missing",
    ).length;
    const resolvedCases = cases.filter(
      (item) => normalizeStatus(item.status) === "found",
    ).length;
    const unassignedCases = cases.filter((item) => !item.police_station_id).length;

    return {
      totalCases: cases.length,
      activeCases,
      resolvedCases,
      unassignedCases,
      totalUsers: users.length,
      totalStations: stations.length,
    };
  }, [cases, users.length, stations.length]);


  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const statusMatches =
        caseFilter === "all" || normalizeStatus(item.status) === caseFilter;
      const searchMatches =
        !query ||
        [
          item.case_id,
          item.name ?? "",
          item.status ?? "",
          item.police_station_id ?? "",
          item.police_station_id ? stationNames.get(item.police_station_id) ?? "" : "",
        ].some((value) => value.toLowerCase().includes(query));

      return statusMatches && searchMatches;
    });
  }, [cases, caseFilter, query, stationNames]);

  const filteredUsers = useMemo(() => {
    if (!query) {
      return users;
    }

    return users.filter((item) =>
      [
        item.user_id,
        item.name ?? "",
        item.email ?? "",
        item.role ?? "user",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [users, query]);

  const filteredStations = useMemo(() => {
    if (!query) {
      return stations;
    }

    return stations.filter((item) =>
      [
        item.station_id,
        item.station_name ?? "",
        item.email ?? "",
        item.location ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [stations, query]);

  const createPoliceStation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingStation(true);

    try {
      const response = await api.post(`${API_PATHS.admin}/create-police`, {
        station_name: stationForm.stationName.trim(),
        email: stationForm.stationEmail.trim(),
        password: stationForm.stationPassword,
        location: stationForm.stationLocation.trim(),
      });

      setStatus(response.data?.message ?? "Police station created");
      setStatusKind("success");
      setStationForm(emptyStationForm);
      setStationFormKey((k) => k + 1);
      await loadData();
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setCreatingStation(false);
    }
  };

  //Popup message
  const requestDeleteCase = (caseId: string) => {
    setCaseToDelete(caseId);
  };

  const cancelDeleteCase = () => {
    setCaseToDelete(null);
  };


  useEffect(() => {
    if (!caseToDelete && !stationToDelete && !userToDelete) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelDeleteCase();
        cancelDeleteStation();
        cancelDeleteUser();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [caseToDelete, stationToDelete, userToDelete]);

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    setIsDeletingCase(true);
    try {
      const response = await api.delete(`${API_PATHS.admin}/case/${caseToDelete}`);
      setStatus(response.data?.message ?? "Case deleted");
      setStatusKind("success");
      await loadData();
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setIsDeletingCase(false);
      setCaseToDelete(null);
    }
  };

  const renderOverview = () => (
    <div className="fade-in admin-modern">
      <section className="dashboard-hero admin-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Admin control center</p>
          <h1>Manage Pahichan operations</h1>
          <p>
            Monitor missing-person records, review registered users, create
            police station accounts, and remove invalid case records from one
            focused workspace.
          </p>
          <div className="hero-actions compact">
            <button
              type="button"
              className="modern-btn primary"
              onClick={() => setActiveTab("stations")}
            >
              <Icon name="plus" />
              Add Station
            </button>
            <button
              type="button"
              className="modern-btn secondary"
              onClick={() => void loadData()}
            >
              <Icon name="refresh" />
              Refresh
            </button>
          </div>
        </div>

        <div className="hero-profile-card admin-signal-card">
          <span className="hero-avatar" aria-hidden="true">
            AD
          </span>
          <div>
            <span className="review-label">System health</span>
            <strong>{stats.activeCases} active case records</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        <StatCard
          label="Total Cases"
          value={stats.totalCases}
          icon="file"
          tone="teal"
        />
        <StatCard
          label="Active Cases"
          value={stats.activeCases}
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Users"
          value={stats.totalUsers}
          icon="users"
          tone="blue"
        />
        <StatCard
          label="Stations"
          value={stats.totalStations}
          icon="building"
          tone="rose"
        />
      </section>

      <section className="admin-dashboard-grid">
        <div className="panel">
          <SectionHeader
            eyebrow="Case status"
            title="Distribution"
            subtitle={`${stats.unassignedCases} cases currently have no station id.`}
          />
          <div className="case-status-bars">
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>Active</span>
                <strong>{stats.activeCases}</strong>
              </div>
              <div className="status-bar-track">
                <span
                  className="status-bar-fill active"
                  style={{
                    width: `${stats.totalCases
                      ? (stats.activeCases / stats.totalCases) * 100
                      : 0
                      }%`,
                  }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>Resolved</span>
                <strong>{stats.resolvedCases}</strong>
              </div>
              <div className="status-bar-track">
                <span
                  className="status-bar-fill resolved"
                  style={{
                    width: `${stats.totalCases
                      ? (stats.resolvedCases / stats.totalCases) * 100
                      : 0
                      }%`,
                  }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>Unassigned</span>
                <strong>{stats.unassignedCases}</strong>
              </div>
              <div className="status-bar-track">
                <span
                  className="status-bar-fill pending"
                  style={{
                    width: `${stats.totalCases
                      ? (stats.unassignedCases / stats.totalCases) * 100
                      : 0
                      }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <SectionHeader
            eyebrow="Quick actions"
            title="Admin Features"
            subtitle="Shortcuts for the supported backend operations."
          />
          <div className="admin-action-list">
            <button type="button" onClick={() => setActiveTab("stations")}>
              <Icon name="plus" />
              Create Police Station
            </button>
            <button type="button" onClick={() => setActiveTab("cases")}>
              <Icon name="trash" />
              Delete Case Record
            </button>
            <button type="button" onClick={() => setActiveTab("users")}>
              <Icon name="users" />
              Review Users
            </button>
            <button type="button" onClick={() => void loadData()}>
              <Icon name="refresh" />
              Refresh Data
            </button>
          </div>
        </div>

        <div className="panel">
          <SectionHeader
            eyebrow="Recent cases"
            title="Latest Records"
            action={
              <button
                type="button"
                className="button ghost small"
                onClick={() => setActiveTab("cases")}
              >
                View All
              </button>
            }
          />
          <div className="admin-mini-list">
            {cases.slice(0, 5).map((item) => (
              <article key={item.case_id}>
                <span className="admin-mini-avatar">
                  {(item.name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{item.name ?? "Unnamed"}</strong>
                  <StatusBadge status={item.status} />
                </div>
              </article>
            ))}
            {cases.length === 0 ? <EmptyState>No case records yet.</EmptyState> : null}
          </div>
        </div>

        <div className="panel">
          <SectionHeader
            eyebrow="Coverage"
            title="Station Load"
            action={
              <button
                type="button"
                className="button ghost small"
                onClick={() => setActiveTab("stations")}
              >
                Manage
              </button>
            }
          />
          <div className="admin-mini-list">
            {stations.slice(0, 5).map((station) => (
              <article key={station.station_id}>
                <span className="admin-mini-avatar station">
                  <Icon name="building" />
                </span>
                <div>
                  <strong>{station.station_name ?? "Unnamed Station"}</strong>
                  <span className="muted">
                    {stationCaseCounts.get(station.station_id) ?? 0} cases
                  </span>
                </div>
              </article>
            ))}
            {stations.length === 0 ? (
              <EmptyState>No stations registered.</EmptyState>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );

  const renderCases = () => (
    <div className="fade-in admin-modern">
      <section className="panel">
        <SectionHeader
          eyebrow="Case management"
          title="All Cases"
          subtitle="Search, filter, and delete missing-person case records."
          action={
            <button
              type="button"
              className="button ghost small"
              onClick={() => void loadData()}
            >
              Refresh
            </button>
          }
        />

        <div className="admin-filter-row">
          <label className="form-group">
            <span>Status</span>
            <select
              value={caseFilter}
              onChange={(event) => setCaseFilter(event.target.value)}
            >
              <option value="all">All Status</option>
              <option value="missing">Missing</option>
              <option value="found">Found</option>
            </select>
          </label>
        </div>

        <CaseTable
          cases={filteredCases}
          stationNames={stationNames}
          onDelete={(caseId) => requestDeleteCase(caseId)}
          searchQuery={searchQuery}
          currentPage={casePage}
          onPageChange={setCasePage}
        />
      </section>
    </div>
  );

  const renderUsers = () => (
    <div className="fade-in admin-modern">
      <section className="panel">
        <SectionHeader
          eyebrow="User registry"
          title="All Users"
          subtitle="Review all user documents returned by the admin backend."
          action={
            <button
              type="button"
              className="button ghost small"
              onClick={() => void loadData()}
            >
              Refresh
            </button>
          }
        />
        <UsersTable
          users={filteredUsers}
          searchQuery={searchQuery}
          currentPage={userPage}
          onPageChange={setUserPage}
          onDelete={(userId) => { requestDeleteUser(userId) }}
        />
      </section>
    </div>
  );

  const renderStations = () => (
    <div className="fade-in admin-modern">
      <section className="admin-stations-layout">
        <div className="panel">
          <SectionHeader
            eyebrow="Create station"
            title="Police Station Account"
            subtitle="Create a protected police login with station name, email, password, and location."
          />
          <CreateStationForm
            key={stationFormKey}
            value={stationForm}
            passwordVisible={showPassword}
            loading={creatingStation}
            onChange={setStationForm}
            onPasswordToggle={() => setShowPassword((current) => !current)}
            onSubmit={createPoliceStation}
          />
        </div>

        <div className="panel">
          <SectionHeader
            eyebrow="Station directory"
            title="Registered Police Stations"
            subtitle={`${filteredStations.length} stations visible with current search.`}
          />
          <div className="admin-stations-grid">
            {filteredStations.map((station) => (
              <StationCard
                key={station.station_id}
                station={station}
                assignedCases={stationCaseCounts.get(station.station_id) ?? 0}
                onDelete={requestDeleteStation}
              />
            ))}
            {filteredStations.length === 0 ? (
              <EmptyState>No police stations found.</EmptyState>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );

  const renderActivity = () => (
    <div className="fade-in admin-modern">
      <section className="admin-dashboard-grid" style={{ gridTemplateColumns: "1.3fr 0.7fr" }}>
        <div className="panel">
          <SectionHeader
            eyebrow="Audit Trail"
            title="System Activity Feed"
            subtitle="Real-time timeline of case registrations, user sign-ups, and police station creation."
          />
          <div className="admin-timeline" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            {activityTimeline.slice(0, 15).map((event) => (
              <article key={event.id} style={{ display: "flex", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "10px", border: "1px solid var(--line)" }}>
                <span className="admin-mini-avatar" style={{ background: event.type === "case" ? "rgba(28,143,120,0.1)" : event.type === "user" ? "rgba(59,130,246,0.1)" : "rgba(139,92,246,0.1)", color: event.type === "case" ? "var(--primary)" : event.type === "user" ? "#3b82f6" : "#8b5cf6", width: "36px", height: "36px", borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name={event.type === "case" ? "file" : event.type === "user" ? "users" : "building"} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                    <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{event.title}</strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{formatDate(event.date)}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>{event.description}</p>
                </div>
              </article>
            ))}
            {activityTimeline.length === 0 ? (
              <EmptyState>No activity logs found on this platform.</EmptyState>
            ) : null}
          </div>
        </div>

        <div className="panel" style={{ height: "fit-content" }}>
          <SectionHeader
            eyebrow="Platform health"
            title="Overview Metrics"
          />
          <div className="admin-timeline" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <article style={{ display: "flex", gap: "10px" }}>
              <Icon name="file" />
              <div>
                <strong>{stats.totalCases} case records loaded</strong>
                <span className="muted" style={{ fontSize: "12px" }}>
                  {stats.activeCases} active, {stats.resolvedCases} resolved.
                </span>
              </div>
            </article>
            <article style={{ display: "flex", gap: "10px" }}>
              <Icon name="users" />
              <div>
                <strong>{stats.totalUsers} users in registry</strong>
                <span className="muted" style={{ fontSize: "12px" }}>Includes citizen and admin records.</span>
              </div>
            </article>
            <article style={{ display: "flex", gap: "10px" }}>
              <Icon name="building" />
              <div>
                <strong>{stats.totalStations} police stations active</strong>
                <span className="muted" style={{ fontSize: "12px" }}>
                  {stats.unassignedCases} cases without a station id.
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "cases":
        return renderCases();
      case "users":
        return renderUsers();
      case "stations":
        return renderStations();
      case "activity":
        return renderActivity();
      case "overview":
      default:
        return renderOverview();
    }
  };

  const searchPlaceholder =
    activeTab === "cases"
      ? "Search cases..."
      : activeTab === "users"
        ? "Search users..."
        : activeTab === "stations"
          ? "Search stations..."
          : "Search dashboard...";

  return (
    <DashboardLayout
      role="admin"
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab as AdminTab);
        setSearchQuery("");
      }}
      userName={adminName}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={searchPlaceholder}
    >
      {loading ? (
        <div className="loading-overlay admin-loading">
          <span className="spinner" />
          Loading admin data...
        </div>
      ) : null}

      {status ? (
        <div className={`form-status ${statusKind} admin-status`}>
          {status}
        </div>
      ) : null}

      {renderContent()}

      {caseToDelete ? (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          onClick={cancelDeleteCase}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-modal-title">Delete this case?</h3>
            <p className="muted">
              This will permanently withdraw Case PH-
              {caseToDelete.substring(0, 5).toUpperCase()}. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button ghost small"
                onClick={cancelDeleteCase}
                disabled={isDeletingCase}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button danger icon-button"
                onClick={() => void confirmDeleteCase()}
                disabled={isDeletingCase}
              >
                {isDeletingCase ? "Deleting..." : "Delete Case"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stationToDelete ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-station-title" onClick={cancelDeleteStation}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-station-title">Delete this station?</h3>
            <p className="muted">
              This will permanently remove this police station account.
              {(stationCaseCounts.get(stationToDelete) ?? 0) > 0
                ? ` Warning: ${stationCaseCounts.get(stationToDelete)} case(s) are currently assigned to it.`
                : ""}{" "}
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="button ghost small" onClick={cancelDeleteStation} disabled={isDeletingStation}>
                Cancel
              </button>
              <button type="button" className="button danger icon-button" onClick={() => void confirmDeleteStation()} disabled={isDeletingStation}>
                {isDeletingStation ? "Deleting..." : "Delete Station"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {userToDelete ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-user-title" onClick={cancelDeleteUser}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-user-title">Delete this user?</h3>
            <p className="muted">
              This will permanently remove this user account. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="button ghost small" onClick={cancelDeleteUser} disabled={isDeletingUser}>
                Cancel
              </button>
              <button type="button" className="button danger icon-button" onClick={() => void confirmDeleteUser()} disabled={isDeletingUser}>
                {isDeletingUser ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
