import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import { loadAuthSession, saveAuthSession } from "../lib/authStorage";
import { useStatusDismiss } from "../lib/useStatusDismiss";
import DashboardLayout from "../components/DashboardLayout";

interface PoliceCase {
  case_id: string;
  name?: string;
  age?: number;
  gender?: string;
  status?: string;
  missing_date?: string;
  photo_url?: string | null;
}

interface MatchLog {
  log_id: string;
  case_id: string;
  similarity_score: number;
  status?: "pending" | "confirmed" | "rejected";
  name?: string;
  age?: number;
  gender?: string;
  photo_url?: string | null;
  missing_date?: string;
  owner_station_id?: string | null;
  owner_station_name?: string;
}

interface BasicInfo {
  name?: string;
  age?: number | string;
  gender?: string;
  category?: string;
  missing_date?: string;
  missing_time?: string;
  lost_address?: string;
  permanent_address?: string;
}

interface PhysicalDetails {
  height?: string;
  weight?: string;
  complexion?: string;
  hair_color?: string;
  eye_color?: string;
  identifying_marks?: string;
}

interface ClothingDetails {
  clothes?: string;
  footwear?: string;
  accessories?: string;
}

interface FamilyDetails {
  mother_name?: string;
  father_name?: string;
  guardian_name?: string;
  relation_with_complainant?: string;
}

interface ComplainantDetails {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface CaseDetails {
  last_seen_location?: string;
  suspected_kidnap?: boolean;
  police_station_id?: string;
}

interface SystemData {
  status?: string;
  created_at?: string;
  found_at?: string;
}

interface PoliceCaseDetail {
  basic_info?: BasicInfo;
  physical_details?: PhysicalDetails;
  clothing_details?: ClothingDetails;
  family_details?: FamilyDetails;
  complainant_details?: ComplainantDetails;
  case_details?: CaseDetails;
  system_data?: SystemData;
}

type PoliceTab = "overview" | "cases" | "matches" | "profile";
type DetailValue = string | number | boolean | null | undefined;
type IconName =
  | "activity"
  | "camera"
  | "check"
  | "clock"
  | "file"
  | "refresh"
  | "scan"
  | "shield"
  | "upload"
  | "user"
  | "x";

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

function normalizeStatus(status?: string) {
  return (status ?? "unknown").toLowerCase().replace(/\s+/g, "-");
}

function formatDate(value?: string) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function displayValue(value: DetailValue) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "Not provided";
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
    case "camera":
      return (
        <svg {...commonProps}>
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
          <circle cx="12" cy="13" r="3" />
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
    case "refresh":
      return (
        <svg {...commonProps}>
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
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
    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      );
    case "upload":
      return (
        <svg {...commonProps}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8 12 3 7 8" />
          <path d="M12 3v12" />
        </svg>
      );
    case "user":
      return (
        <svg {...commonProps}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "x":
      return (
        <svg {...commonProps}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
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
    <div className="panel-header police-section-header">
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
    <article className="stat-card-modern police-stat-card">
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

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state empty-panel">{children}</div>;
}

function CaseCard({
  item,
  onView,
  onMarkFound,
  updatingCaseId,
}: {
  item: PoliceCase;
  onView: (caseId: string) => void;
  onMarkFound: (caseId: string) => void;
  updatingCaseId: string | null;
}) {
  const isActive = normalizeStatus(item.status) === "missing";

  return (
    <article className="police-case-card">
      {item.photo_url ? (
        <img
          src={item.photo_url}
          alt={`${item.name ?? "Missing person"} case photo`}
          className="police-case-photo"
        />
      ) : (
        <div className="police-case-photo police-case-placeholder">No Photo</div>
      )}

      <div className="police-case-body">
        <div>
          <h3>{item.name ?? "Unnamed"}</h3>
          <p className="muted">Case PH-{item.case_id.substring(0, 5).toUpperCase()}</p>
        </div>
        <div className="police-case-meta">
          <span>Age {item.age ?? "N/A"}</span>
          <span>{item.gender ?? "N/A"}</span>
          <span>{formatDate(item.missing_date)}</span>
          <StatusBadge status={item.status} />
        </div>

      </div>
      <div className="police-case-actions">

        <div className="police-case-buttons">
          <button
            type="button"
            className="button ghost small"
            onClick={() => onView(item.case_id)}
          >
            View Details
          </button>
          {isActive ? (
            <button
              type="button"
              className="button primary small"
              disabled={updatingCaseId === item.case_id}
              onClick={(e) => {
                e.stopPropagation();
                onMarkFound(item.case_id);
              }}
            >
              {updatingCaseId === item.case_id ? "Updating..." : "Mark as Found"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DetailList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: DetailValue }>;
}) {
  return (
    <section className="detail-list">
      <h3>{title}</h3>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{displayValue(row.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CaseDetailPanel({
  caseId,
  detail,
  loading,
  error,
  onClose,
  currentStationId,
  updatingStatus,
  onUpdateStatus,
  matchContext,
}: {
  caseId: string | null;
  detail: PoliceCaseDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  currentStationId: string | null;
  updatingStatus: boolean;
  onUpdateStatus: (caseId: string, status: string) => void;
  matchContext?: {
    match: MatchLog;
    updating: boolean;
    notifying: boolean;
    onConfirm: (logId: string) => void;
    onNotifyOwner: (caseId: string, logId: string) => void;
  } | null;
}) {
  if (!caseId) {
    return null;
  }

  const isMatchOwner =
    matchContext &&
    (!matchContext.match.owner_station_id || matchContext.match.owner_station_id === currentStationId);
  return (
    <section className="panel police-detail-panel">
      <SectionHeader
        eyebrow="Case detail"
        title={`Case PH-${caseId.substring(0, 5).toUpperCase()}`}
        action={
          <button type="button" className="button ghost small" onClick={onClose}>
            Close
          </button>
        }
      />

      {loading ? (
        <div className="loading-overlay">
          <span className="spinner" />
          Loading case details...
        </div>
      ) : null}

      {error ? <p className="status-text">{error}</p> : null}

      {/* AI match action block — only shown when opened from a match result */}
      {matchContext && matchContext.match.status === "pending" ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            padding: "16px",
            background: "rgba(59, 130, 246, 0.06)",
            borderRadius: "12px",
            border: "1px dashed rgba(59, 130, 246, 0.25)",
          }}
        >
          <span style={{ fontWeight: 800, color: "var(--ink)", marginRight: "8px" }}>
            AI Match ({(Number(matchContext.match.similarity_score) * 100).toFixed(1)}%):
          </span>

          {isMatchOwner ? (
            <button
              type="button"
              className="button primary small"
              disabled={matchContext.updating}
              onClick={() => matchContext.onConfirm(matchContext.match.log_id)}
            >
              {matchContext.updating ? "Updating..." : "Confirm Match"}
            </button>
          ) : (
            <button
              type="button"
              className="modern-btn primary small"
              style={{ padding: "6px 14px", fontSize: "13px", background: "var(--accent-tint, #3b82f6)", color: "white" }}
              disabled={matchContext.notifying}
              onClick={() => matchContext.onNotifyOwner(matchContext.match.case_id, matchContext.match.log_id)}
            >
              {/* <Icon name="scan" /> */}
              {matchContext.notifying ? "Notifying..." : "Notify Owner Station"}
            </button>
          )}
        </div>
      ) : null}


      {!matchContext && detail && detail.case_details?.police_station_id === currentStationId &&
        normalizeStatus(detail.system_data?.status) === "missing" ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "20px", padding: "16px", background: "rgba(28, 143, 120, 0.06)", borderRadius: "12px", border: "1px dashed rgba(28, 143, 120, 0.25)" }}>
          <span style={{ fontWeight: 800, color: "var(--ink)", marginRight: "8px" }}>Update Case Status:</span>
          <button
            type="button"
            className="modern-btn primary small"
            style={{ padding: "6px 14px", fontSize: "13px" }}
            disabled={updatingStatus}
            onClick={() => onUpdateStatus(caseId, "found")}
          >
            {updatingStatus ? "Updating..." : "Mark as Found"}
          </button>
        </div>
      ) : null}

      {detail ? (
        <div>
          <div className="detail-grid">
            <DetailList
              title="Basic Info"
              rows={[
                { label: "Name", value: detail.basic_info?.name },
                { label: "Age", value: detail.basic_info?.age },
                { label: "Gender", value: detail.basic_info?.gender },
                { label: "Category", value: detail.basic_info?.category },
                {
                  label: "Missing Date",
                  value: formatDate(detail.basic_info?.missing_date),
                },
                { label: "Missing Time", value: detail.basic_info?.missing_time },
                { label: "Lost Address", value: detail.basic_info?.lost_address },
                {
                  label: "Permanent Address",
                  value: detail.basic_info?.permanent_address,
                },
              ]}
            />
            <DetailList
              title="Appearance"
              rows={[
                { label: "Height", value: detail.physical_details?.height },
                { label: "Weight", value: detail.physical_details?.weight },
                { label: "Complexion", value: detail.physical_details?.complexion },
                { label: "Hair Color", value: detail.physical_details?.hair_color },
                { label: "Eye Color", value: detail.physical_details?.eye_color },
                {
                  label: "Identifying Marks",
                  value: detail.physical_details?.identifying_marks,
                },
              ]}
            />
            <DetailList
              title="Clothing"
              rows={[
                { label: "Clothes", value: detail.clothing_details?.clothes },
                { label: "Footwear", value: detail.clothing_details?.footwear },
                {
                  label: "Accessories",
                  value: detail.clothing_details?.accessories,
                },
              ]}
            />
            <DetailList
              title="Complainant"
              rows={[
                { label: "Name", value: detail.complainant_details?.name },
                { label: "Phone", value: detail.complainant_details?.phone },
                { label: "Email", value: detail.complainant_details?.email },
                { label: "Address", value: detail.complainant_details?.address },
              ]}
            />
            <DetailList
              title="Family"
              rows={[
                { label: "Mother", value: detail.family_details?.mother_name },
                { label: "Father", value: detail.family_details?.father_name },
                { label: "Guardian", value: detail.family_details?.guardian_name },
                {
                  label: "Relation",
                  value: detail.family_details?.relation_with_complainant,
                },
              ]}
            />
            <DetailList
              title="Case"
              rows={[
                {
                  label: "Last Seen",
                  value: detail.case_details?.last_seen_location,
                },
                {
                  label: "Suspected Kidnap",
                  value: detail.case_details?.suspected_kidnap,
                },
                { label: "Status", value: detail.system_data?.status },
              ]}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}



function SimilarityMeter({ score }: { score: number }) {
  const percent = Math.max(0, Math.min(100, score));

  const tone =
    percent >= 85 ? "high" : percent >= 60 ? "medium" : "low";

  const label =
    tone === "high" ? "Strong match" : tone === "medium" ? "Possible match" : "Weak match";

  return (
    <div className={`similarity-meter ${tone}`} title={`${percent.toFixed(1)}% similarity`}>
      <div className="similarity-meter-header">
        <span>Similarity</span>
        <strong>{percent.toFixed(1)}%</strong>
      </div>
      <div className="similarity-meter-track">
        <div
          className="similarity-meter-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="similarity-meter-label">{label}</span>
    </div>
  );
}


function MatchResultCard({
  match,
  onViewDetail,
  onNotifyOwner,
  currentStationId,
  notifyingLogId,
}: {
  match: MatchLog;
  onNotifyOwner: (caseId: string, logId: string) => void;
  onViewDetail: (match: MatchLog) => void;
  currentStationId: string | null;
  notifyingLogId: string | null;
}) {
  const scorePercent = Math.max(
    0,
    Math.min(100, Number(match.similarity_score) * 100),
  );

  const isOwner = !match.owner_station_id || match.owner_station_id === currentStationId;

  return (
    <article className="police-case-card">
      {match.photo_url ? (
        <img
          src={match.photo_url}
          alt={match.name ?? "Matched person"}
          className="police-case-photo"
        />
      ) : (
        <div className="police-case-photo police-case-placeholder">
          <Icon name="camera" />
        </div>
      )}

      <div className="police-case-body">
        <div>
          <h3>{match.name ?? "Unknown Person"}</h3>
          <p>
            Case: PH-{match.case_id.substring(0, 5).toUpperCase()}
          </p>
          <p style={{ fontSize: "12px" }}>
            <strong>Assigned to:</strong> {match.owner_station_name || "Unknown Station"}
          </p>
        </div>


        <div className="police-case-meta">
          <span>Age {match.age ?? "N/A"}</span>
          <span>{match.gender ?? "N/A"}</span>
          {match.status === "pending" ? (
            <StatusBadge status="pending" />
          ) : (
            <StatusBadge status={match.status} />
          )}
          <span>Missing since {formatDate(match.missing_date)}</span>
        </div>
        <SimilarityMeter score={scorePercent} />
      </div>


      <div className="police-case-actions">
        <div className="police-case-buttons">
          <button
            type="button"
            className="button ghost small"
            onClick={() => onViewDetail(match)}
          >
            View Details
          </button>

          {match.status === "pending" && !isOwner ? (
            <button
              type="button"
              className="button primary small"
              disabled={notifyingLogId === match.case_id}
              onClick={() => onNotifyOwner(match.case_id, match.log_id)}
            >
              <Icon name="scan" />
              {notifyingLogId === match.case_id ? "Notifying..." : "Notify Owner Station"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}



const BULK_NOTIFY_THRESHOLD = 5;

function MatchWorkbench({
  photo,
  matches,
  foundCaseId,
  matching,
  onPhotoChange,
  onSubmit,
  onViewDetail,
  onNotifyOwner,
  onNotifyAll,
  notifyingAll,
  currentStationId,
  notifyingLogId,
}: {
  photo: File | null;
  matches: MatchLog[];
  foundCaseId: string;
  matching: boolean;
  onPhotoChange: (photo: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onViewDetail: (match: MatchLog) => void;
  onNotifyOwner: (caseId: string, logId: string) => void;
  onNotifyAll: () => void;
  notifyingAll: boolean;
  currentStationId: string | null;
  notifyingLogId: string | null;
}) {
  const distinctOtherStations = useMemo(() => {
    const ids = new Set(
      matches
        .filter((m) => m.owner_station_id && m.owner_station_id !== currentStationId)
        .map((m) => m.owner_station_id as string),
    );
    return ids.size;
  }, [matches, currentStationId]);


  return (
    <section className="panel police-match-workbench">
      <SectionHeader
        eyebrow="AI face matching"
        title="Upload Found Person Photo"
        subtitle="The backend generates an embedding, compares it with active missing cases, and returns the closest matches."
      />

      <form className="police-upload-form" onSubmit={onSubmit}>
        <label className="photo-dropzone">
          <Icon name="upload" />
          <span>
            <strong>{photo ? photo.name : "Upload a clear face photo"}</strong>
          </span>
          <input type="file" accept="image/*" onChange={(event) => onPhotoChange(event.target.files?.[0] ?? null)} />
        </label>

        <button type="submit" className="modern-btn primary" disabled={matching}>
          <Icon name="scan" />
          {matching ? "Matching..." : "Run Face Match"}
        </button>
      </form>

      {foundCaseId ? (
        <p className="police-found-id">
          Found report: <span className="mono">PH-{foundCaseId.substring(0, 5).toUpperCase()}</span>
        </p>
      ) : null}

      {distinctOtherStations > BULK_NOTIFY_THRESHOLD ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            padding: "14px 16px",
            marginBottom: "16px",
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px dashed rgba(59, 130, 246, 0.3)",
            borderRadius: "12px",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "13px" }}>
            This match spans {distinctOtherStations} other stations.
          </span>
          <button
            type="button"
            className="modern-btn primary"
            style={{ background: "var(--accent-tint, #3b82f6)", color: "white" }}
            disabled={notifyingAll}
            onClick={onNotifyAll}
          >
            {/* <Icon name="scan" /> */}
            {notifyingAll ? "Notifying All..." : `Notify All ${distinctOtherStations} Stations`}
          </button>
        </div>
      ) : null}

      <div className="police-match-grid">
        {matches.map((match) => (
          <MatchResultCard
            key={match.log_id}
            match={match}
            onViewDetail={onViewDetail}
            onNotifyOwner={onNotifyOwner}
            currentStationId={currentStationId}
            notifyingLogId={notifyingLogId}
          />
        ))}
        {matches.length === 0 ? (
          <EmptyState>No AI match results yet. Upload a found-person photo to start.</EmptyState>
        ) : null}
      </div>
    </section>
  );
}

export default function PoliceDashboard() {
  const session = loadAuthSession();
  const [activeTab, setActiveTab] = useState<PoliceTab>("overview");
  const [cases, setCases] = useState<PoliceCase[]>([]);
  const [caseStatusTab, setCaseStatusTab] = useState<"all" | "active" | "resolved">("active");
  const [notifyingLogId, setNotifyingLogId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchLog | null>(null);
  const [notifyingAll, setNotifyingAll] = useState(false);
  const [profilePassword, setProfilePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    stationName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const handleViewMatchDetail = (match: MatchLog) => {
    setActiveMatch(match);
    void loadCaseDetail(match.case_id);
  };

  const handleNotificationClick = async (notif: { type?: string; case_id?: string; log_id?: string }) => {
    const actionableTypes = new Set(["match_suggestion", "match_suggestion_bulk"]);

    if (notif.log_id && (!notif.type || actionableTypes.has(notif.type))) {
      setActiveTab("matches");
      try {
        const response = await api.get(`${API_PATHS.match}/log/${notif.log_id}`);
        const match: MatchLog = { ...response.data, status: response.data.status ?? "pending" };
        setActiveMatch(match);
        await loadCaseDetail(match.case_id);
      } catch (error) {
        setStatusKind("error");
        setStatus(getErrorMessage(error));
      }
      return;
    }

    if (notif.case_id) {
      setActiveTab("cases");
      setActiveMatch(null);
      void loadCaseDetail(notif.case_id);
    }
  };

  const handleNotifyAllOwners = async () => {
    if (!foundCaseId) return;
    setNotifyingAll(true);
    try {
      const response = await api.post(`${API_PATHS.match}/notify-owners-bulk`, {
        found_case_id: foundCaseId,
      });
      setStatusKind("success");
      setStatus(response.data?.message ?? "Notified all matched stations.");
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setNotifyingAll(false);
    }
  };


  // Auto-dismiss status banner after 4 seconds
  useStatusDismiss(status, setStatus);

  const handleNotifyOwner = async (caseId: string, logId: string) => {
    setNotifyingLogId(caseId);
    try {
      await api.post(`${API_PATHS.match}/notify-owner`, { case_id: caseId, log_id: logId });
      setStatusKind("success");
      setStatus("Notification sent to owner station successfully.");
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setNotifyingLogId(null);
    }
  };

  const handleUpdateCaseStatus = async (caseId: string, newStatus: string) => {
    setUpdatingStatus(caseId);
    setStatus("");
    try {
      const response = await api.put(`${API_PATHS.police}/case/${caseId}/status`, { status: newStatus });
      setStatusKind("success");
      setStatus(response.data?.message ?? "Case status updated successfully.");

      if (selectedCaseId === caseId) {
        await loadCaseDetail(caseId);
      }
      await loadCases();
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setUpdatingStatus(null);
    }
  };
  const [caseDetail, setCaseDetail] = useState<PoliceCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [matchPhoto, setMatchPhoto] = useState<File | null>(null);
  const [matches, setMatches] = useState<MatchLog[]>([]);
  const [foundCaseId, setFoundCaseId] = useState("");
  const [matching, setMatching] = useState(false);
  const [updatingLogId, setUpdatingLogId] = useState("");
  const [profileName, setProfileName] = useState(
    session?.name ??
    localStorage.getItem("policeName") ??
    "Police Station"
  );
  const [sidebarName, setSidebarName] = useState(
    session?.name ??
    localStorage.getItem("policeName") ??
    "Police Station"
  );
  const [profileEmail, setProfileEmail] = useState(
    session?.email ??
    localStorage.getItem("policeEmail") ??
    ""
  );
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (caseDetail) {
      setTimeout(() => {
        const element = document.querySelector(".police-detail-panel");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [caseDetail]);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`${API_PATHS.police}/cases`);
      setCases(response.data?.cases ?? []);
      setStatus("");
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCases();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCases]);

  const stats = useMemo(() => {
    const activeStatuses = new Set(["missing"]);
    const resolvedStatuses = new Set(["found"]);
    const activeCases = cases.filter((item) =>
      activeStatuses.has(normalizeStatus(item.status)),
    ).length;
    const resolvedCases = cases.filter((item) =>
      resolvedStatuses.has(normalizeStatus(item.status)),
    ).length;
    const urgentCases = cases.filter(
      (item) => Number(item.age) < 18 && activeStatuses.has(normalizeStatus(item.status)),
    ).length;

    return {
      total: cases.length,
      active: activeCases,
      resolved: resolvedCases,
      urgent: urgentCases,
      matches: matches.length,
    };
  }, [cases, matches.length]);

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const tabFiltered = cases.filter((item) => {
      const status = normalizeStatus(item.status);
      if (caseStatusTab === "all") return true;
      if (caseStatusTab === "active") return status === "missing";
      if (caseStatusTab === "resolved") return status === "found";
      return true;
    });

    if (!query) {
      return tabFiltered;
    }

    return tabFiltered.filter((item) =>
      [
        item.case_id,
        item.name ?? "",
        item.gender ?? "",
        item.status ?? "",
        item.missing_date ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [cases, searchQuery, caseStatusTab]);

  const filteredMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return matches;
    }

    return matches.filter((item) =>
      [item.case_id, item.log_id, item.status ?? "pending"].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [matches, searchQuery]);

  const loadCaseDetail = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setCaseDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response = await api.get(`${API_PATHS.police}/case/${caseId}`);
      setCaseDetail(response.data?.case_data ?? null);
    } catch (error) {
      setDetailError(getErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const runMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!matchPhoto) {
      setStatusKind("error");
      setStatus("Photo is required for matching.");
      return;
    }

    setMatching(true);
    setStatus("");

    const formData = new FormData();
    formData.append("photo", matchPhoto);

    try {
      const response = await api.post(`${API_PATHS.match}/match-found`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setFoundCaseId(response.data?.found_case_id ?? "");
      setMatches(
        (response.data?.matches ?? []).map((match: MatchLog) => ({
          ...match,
          status: "pending",
        })),
      );
      setMatchPhoto(null);
      setStatusKind("success");
      setStatus("AI matching completed.");
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
      setMatches([]);
    } finally {
      setMatching(false);
    }
  };

  const updateMatchStatus = async (
    logId: string,
    action: "confirm-match" | "reject-match",
  ) => {
    setUpdatingLogId(logId);

    try {
      const response = await api.post(`${API_PATHS.match}/${action}`, {
        log_id: logId,
      });
      const nextStatus = action === "confirm-match" ? "confirmed" : "rejected";
      setMatches((current) =>
        current.map((item) =>
          item.log_id === logId ? { ...item, status: nextStatus } : item,
        ),
      );
      setStatusKind("success");
      setStatus(response.data?.message ?? "Match updated.");
      await loadCases();
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setUpdatingLogId("");
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    const nextName = profileName.trim();
    const nextEmail = profileEmail.trim();
    const errors: typeof fieldErrors = {};

    if (!nextName) {
      errors.stationName = "Station name is required.";
    }

    if (!nextEmail) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (profilePassword) {
      if (profilePassword.length < 8) {
        errors.password = "New password must be at least 8 characters.";
      }
      if (confirmPassword !== profilePassword) {
        errors.confirmPassword = "Passwords do not match.";
      }
    } else if (confirmPassword) {
      errors.password = "Enter a new password first.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingProfile(true);

    try {
      const payload: {
        station_name: string;
        email: string;
        password?: string;
      } = {
        station_name: nextName,
        email: nextEmail,
      };

      if (profilePassword) {
        payload.password = profilePassword;
      }

      const response = await api.put(`${API_PATHS.police}/profile`, payload);
      const updatedName = response.data?.name ?? nextName;
      const updatedEmail = response.data?.email ?? nextEmail;

      setProfileName(updatedName);
      setSidebarName(updatedName);
      setProfileEmail(updatedEmail);
      localStorage.setItem("policeName", updatedName);
      localStorage.setItem("policeEmail", updatedEmail);

      if (session) {
        saveAuthSession({
          ...session,
          name: updatedName,
          email: updatedEmail,
        });
      }

      setProfilePassword("");
      setConfirmPassword("");
      setStatusKind("success");
      setStatus(
        profilePassword
          ? "Profile updated successfully. Password was also changed."
          : "Profile updated successfully.",
      );
    } catch (error) {
      setStatusKind("error");
      setStatus(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const renderOverview = () => (
    <div className="fade-in police-modern">
      <section className="dashboard-hero police-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Police station workspace</p>
          <h1>Manage assigned cases and AI matches</h1>
          <p>
            Review station-assigned missing-person reports, inspect full case
            details, upload found-person photos for AI comparison, and confirm
            or reject possible matches.
          </p>
          <div className="hero-actions compact">
            <button
              type="button"
              className="modern-btn primary"
              onClick={() => setActiveTab("matches")}
            >
              <Icon name="scan" />
              Run Match
            </button>
            <button
              type="button"
              className="modern-btn secondary"
              onClick={() => void loadCases()}
            >
              <Icon name="refresh" />
              Refresh Cases
            </button>
          </div>
        </div>

        <div className="hero-profile-card police-signal-card">
          <span className="hero-avatar" aria-hidden="true">
            PS
          </span>
          <div>
            <span className="review-label">Station queue</span>
            <strong>{stats.active} active assigned cases</strong>
          </div>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        <StatCard label="Assigned Cases" value={stats.total} icon="file" tone="teal" />
        <StatCard label="Active Cases" value={stats.active} icon="clock" tone="amber" />
        <StatCard label="Resolved" value={stats.resolved} icon="check" tone="blue" />
        <StatCard label="Child Cases" value={stats.urgent} icon="shield" tone="rose" />
      </section>

      <section className="police-dashboard-grid">
        <div className="panel">
          <SectionHeader
            eyebrow="Queue status"
            title="Case Load"
            subtitle={`${stats.matches} AI match results from the latest run.`}
          />
          <div className="case-status-bars">
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>Active</span>
                <strong>{stats.active}</strong>
              </div>
              <div className="status-bar-track">
                <span
                  className="status-bar-fill active"
                  style={{
                    width: `${stats.total ? (stats.active / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>Resolved</span>
                <strong>{stats.resolved}</strong>
              </div>
              <div className="status-bar-track">
                <span
                  className="status-bar-fill resolved"
                  style={{
                    width: `${stats.total ? (stats.resolved / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="status-bar-item">
              <div className="status-bar-label">
                <span>Child Cases</span>
                <strong>{stats.urgent}</strong>
              </div>
              <div className="status-bar-track">
                <span
                  className="status-bar-fill pending"
                  style={{
                    width: `${stats.total ? (stats.urgent / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <SectionHeader
            eyebrow="Recent assignments"
            title="Latest Cases"
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
          <div className="police-mini-list">
            {cases.slice(0, 5).map((item) => (
              <article key={item.case_id}>
                <span className="police-mini-avatar">
                  {(item.name ?? "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{item.name ?? "Unnamed"}</strong>
                  <StatusBadge status={item.status} />
                </div>
              </article>
            ))}
            {cases.length === 0 ? <EmptyState>No assigned cases found.</EmptyState> : null}
          </div>
        </div>
      </section>
    </div>
  );

  const renderCases = () => (
    <div className="fade-in police-modern">
      <section className="panel police-case-section">
        <SectionHeader
          eyebrow="Case queue"
          title="Assigned Cases"
          subtitle="Only cases assigned to the logged-in police station are shown."
          action={
            <button
              type="button"
              className="button ghost small"
              onClick={() => void loadCases()}
            >
              Refresh
            </button>
          }
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
          <button
            type="button"
            className={`modern-btn ${caseStatusTab === "all" ? "primary" : "secondary"}`}
            style={{ padding: "8px 16px", fontSize: "13px" }}
            onClick={() => setCaseStatusTab("all")}
          >
            All Cases ({cases.length})
          </button>
          <button
            type="button"
            className={`modern-btn ${caseStatusTab === "active" ? "primary" : "secondary"}`}
            style={{ padding: "8px 16px", fontSize: "13px" }}
            onClick={() => setCaseStatusTab("active")}
          >
            Active / Missing ({cases.filter(c => normalizeStatus(c.status) === "missing").length})
          </button>
          <button
            type="button"
            className={`modern-btn ${caseStatusTab === "resolved" ? "primary" : "secondary"}`}
            style={{ padding: "8px 16px", fontSize: "13px" }}
            onClick={() => setCaseStatusTab("resolved")}
          >
            Resolved / Found ({cases.filter(c => normalizeStatus(c.status) === "found").length})
          </button>
        </div>
        <div className="police-case-grid">
          {filteredCases.map((item) => (
            <CaseCard
              key={item.case_id}
              item={item}
              onView={(caseId) => {
                setActiveMatch(null);
                void loadCaseDetail(caseId);
              }}
              onMarkFound={(caseId) => void handleUpdateCaseStatus(caseId, "found")}
              updatingCaseId={updatingStatus}
            />
          ))}
          {filteredCases.length === 0 ? (
            <EmptyState>No cases match the current search.</EmptyState>
          ) : null}
        </div>
      </section>

      <CaseDetailPanel
        caseId={selectedCaseId}
        detail={caseDetail}
        loading={detailLoading}
        error={detailError}
        currentStationId={session?.id ?? null}
        updatingStatus={Boolean(updatingStatus)}
        onUpdateStatus={handleUpdateCaseStatus}
        onClose={() => {
          setSelectedCaseId(null);
          setCaseDetail(null);
          setDetailError("");
        }}
      />
    </div>
  );

  const renderMatches = () => (
    <div className="fade-in police-modern">
      <MatchWorkbench
        photo={matchPhoto}
        matches={filteredMatches}
        foundCaseId={foundCaseId}
        matching={matching}
        // updatingLogId={updatingLogId}
        onPhotoChange={setMatchPhoto}
        onSubmit={runMatch}
        onViewDetail={handleViewMatchDetail}
        onNotifyOwner={handleNotifyOwner}
        onNotifyAll={() => void handleNotifyAllOwners()}
        notifyingAll={notifyingAll}
        currentStationId={session?.id || null}
        notifyingLogId={notifyingLogId}
      />
      <CaseDetailPanel
        caseId={selectedCaseId}
        detail={caseDetail}
        loading={detailLoading}
        error={detailError}
        currentStationId={session?.id ?? null}
        updatingStatus={Boolean(updatingStatus)}
        onUpdateStatus={handleUpdateCaseStatus}
        matchContext={
          activeMatch
            ? {
              match: activeMatch,
              updating: updatingLogId === activeMatch.log_id,
              notifying: notifyingLogId === activeMatch.case_id,
              onConfirm: (logId) => void updateMatchStatus(logId, "confirm-match"),
              onNotifyOwner: handleNotifyOwner,
            }
            : null
        }
        onClose={() => {
          setSelectedCaseId(null);
          setCaseDetail(null);
          setDetailError("");
          setActiveMatch(null);
        }}
      />
    </div>
  );

  const renderProfile = () => (
    <div className="fade-in police-modern">
      <section className="panel police-profile-panel">
        <SectionHeader
          eyebrow="Station profile"
          title="Profile Settings"
          subtitle="Manage your police station display details and secure your account credentials."
        />

        <form className="wizard-form" onSubmit={saveProfile} noValidate>
          <div className="profile-preview">
            <span className="hero-avatar compact-avatar" aria-hidden="true">
              {profileName
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "U"}
            </span>
            <div>
              <strong>{profileName || "Police Station"}</strong>
              <span>{profileEmail || "Email not added"}</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-group">
              <span>Station Name</span>
              <input
                value={profileName}
                onChange={(event) => {
                  setProfileName(event.target.value);
                  setFieldErrors((current) => ({ ...current, stationName: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.stationName)}
              />
              {fieldErrors.stationName ? (
                <span className="field-error">{fieldErrors.stationName}</span>
              ) : null}
            </label>

            <label className="form-group">
              <span>Email Address</span>
              <input
                type="email"
                value={profileEmail}
                onChange={(event) => {
                  setProfileEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                placeholder="station@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? (
                <span className="field-error">{fieldErrors.email}</span>
              ) : null}
            </label>

            <label className="form-group full-span">
              <span>Change Password</span>
              <div className="password-wrapper">
                <input
                  type={showProfilePassword ? "text" : "password"}
                  value={profilePassword}
                  onChange={(event) => {
                    setProfilePassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                  placeholder="Enter a new password"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowProfilePassword((current) => !current)}
                  aria-label={showProfilePassword ? "Hide password" : "Show password"}
                >
                  <PasswordEyeIcon visible={showProfilePassword} />
                </button>
              </div>
              {fieldErrors.password ? (
                <span className="field-error">{fieldErrors.password}</span>
              ) : null}
            </label>

            <label className="form-group full-span">
              <span>Confirm New Password</span>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }}
                  onBlur={() => {
                    if (profilePassword && confirmPassword && confirmPassword !== profilePassword) {
                      setFieldErrors((current) => ({ ...current, confirmPassword: "Passwords do not match." }));
                    }
                  }}
                  placeholder="Re-enter the new password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <PasswordEyeIcon visible={showConfirmPassword} />
                </button>
              </div>
              {fieldErrors.confirmPassword ? (
                <span className="field-error">{fieldErrors.confirmPassword}</span>
              ) : null}
            </label>
          </div>

          <div className="wizard-actions">
            <span />
            <button type="submit" className="modern-btn primary" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "cases":
        return renderCases();
      case "matches":
        return renderMatches();
      case "profile":
        return renderProfile();
      case "overview":
      default:
        return renderOverview();
    }
  };

  const searchPlaceholder =
    activeTab === "cases"
      ? "Search assigned cases..."
      : activeTab === "matches"
        ? "Search match results..."
        : "Search police dashboard...";

  return (
    <DashboardLayout
      role="police"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as PoliceTab)}
      userName={sidebarName}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={searchPlaceholder}
      onNotificationClick={handleNotificationClick}
    >
      {loading ? (
        <div className="loading-overlay police-loading">
          <span className="spinner" />
          Loading assigned cases...
        </div>
      ) : null}

      {status ? (
        <div className={`form-status ${statusKind} police-status`}>{status}</div>
      ) : null}

      {renderContent()}
    </DashboardLayout>
  );
}
