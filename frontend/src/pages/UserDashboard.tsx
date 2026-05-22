import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import { loadAuthSession } from "../lib/authStorage";
import DashboardLayout from "../components/DashboardLayout";
import ProgressiveReportForm from "../components/ProgressiveReportForm";

interface CaseItem {
  case_id: string;
  name?: string;
  status?: string;
  missing_date?: string;
  photo_url?: string | null;
}

interface PoliceStationOption {
  station_id: string;
  station_name?: string;
  location?: string;
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
  emergency_level?: string;
  police_station_id?: string;
}

interface SystemData {
  status?: string;
  created_at?: string;
}

interface UserCaseDetail {
  basic_info?: BasicInfo;
  physical_details?: PhysicalDetails;
  clothing_details?: ClothingDetails;
  family_details?: FamilyDetails;
  complainant_details?: ComplainantDetails;
  case_details?: CaseDetails;
  system_data?: SystemData;
}

type DetailValue = string | number | boolean | null | undefined;

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
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

function statusTone(status?: string) {
  return (status ?? "unknown").toLowerCase().replace(/\s+/g, "-");
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

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
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
      <path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9" />
      <path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2" />
      <path d="M14.1 14.1a3 3 0 0 1-4.2-4.2" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function UserDashboard() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [stations, setStations] = useState<PoliceStationOption[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("User");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<UserCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStatus, setDetailStatus] = useState("");

  useEffect(() => {
    const session = loadAuthSession();
    const storedName = localStorage.getItem("userName");
    const storedEmail = localStorage.getItem("userEmail");

    if (session?.name) {
      setUserName(session.name);
      localStorage.setItem("userName", session.name);
    } else if (storedName) {
      setUserName(storedName);
    }

    if (session?.email) {
      setProfileEmail(session.email);
      localStorage.setItem("userEmail", session.email);
    } else if (storedEmail) {
      setProfileEmail(storedEmail);
    }
  }, []);

  const loadCases = async () => {
    try {
      const response = await api.get(`${API_PATHS.user}/my-cases`);
      setCases(response.data?.cases ?? []);
      setStatus("");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  const loadStations = async () => {
    setStationsLoading(true);
    try {
      const response = await api.get(`${API_PATHS.user}/police-stations`);
      setStations(response.data?.stations ?? []);
    } catch {
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  };

  useEffect(() => {
    void loadCases();
    void loadStations();
  }, []);

  const sortedStations = useMemo(
    () =>
      [...stations].sort((a, b) =>
        String(a.station_name ?? "").localeCompare(
          String(b.station_name ?? ""),
          undefined,
          { sensitivity: "base" },
        ),
      ),
    [stations],
  );

  const stationLookup = useMemo(() => {
    const lookup = new Map<string, PoliceStationOption>();
    stations.forEach((station) => {
      lookup.set(station.station_id, station);
    });
    return lookup;
  }, [stations]);

  const filteredCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return cases;
    }

    return cases.filter((item) =>
      [
        item.case_id,
        item.name ?? "",
        item.status ?? "",
        item.missing_date ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [cases, searchQuery]);

  const stats = useMemo(() => {
    const openStatuses = new Set(["missing", "active", "pending"]);
    const resolvedStatuses = new Set(["found", "resolved", "confirmed"]);
    const openCases = cases.filter((item) =>
      openStatuses.has(statusTone(item.status)),
    ).length;
    const resolvedCases = cases.filter((item) =>
      resolvedStatuses.has(statusTone(item.status)),
    ).length;
    const latestCase = [...cases].sort(
      (a, b) =>
        new Date(b.missing_date ?? 0).getTime() -
        new Date(a.missing_date ?? 0).getTime(),
    )[0];

    return {
      total: cases.length,
      open: openCases,
      resolved: resolvedCases,
      stations: stations.length,
      latestDate: latestCase?.missing_date,
    };
  }, [cases, stations.length]);

  const loadCaseDetail = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setCaseDetail(null);
    setDetailStatus("");
    setDetailLoading(true);

    try {
      const response = await api.get(`${API_PATHS.user}/case/${caseId}`);
      setCaseDetail((response.data?.case_data ?? response.data) as UserCaseDetail);
    } catch (error) {
      setDetailStatus(getErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReportSuccess = () => {
    setActiveTab("overview");
    void loadCases();
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    localStorage.setItem("userName", userName.trim() || "User");
    localStorage.setItem("userEmail", profileEmail.trim());
    setProfilePassword("");
    setProfileStatus(
      profilePassword
        ? "Profile saved locally. Password changes need a backend endpoint."
        : "Profile saved locally.",
    );
  };

  const selectedStationId = caseDetail?.case_details?.police_station_id;
  const selectedStation = selectedStationId
    ? stationLookup.get(selectedStationId)
    : undefined;

  return (
    <DashboardLayout
      role="user"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName={userName}
      searchTerm={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search your cases..."
    >
      {activeTab === "overview" ? (
        <div className="fade-in user-dashboard">
          <section className="dashboard-hero">
            <div className="dashboard-hero-copy">
              <p className="eyebrow">Citizen workspace</p>
              <h1>Welcome back, {userName}</h1>
              <p>
                Report a missing person, track submitted records, review case
                details, and keep your profile information ready.
              </p>
              <div className="hero-actions compact">
                <button
                  type="button"
                  className="modern-btn primary"
                  onClick={() => setActiveTab("report")}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Report
                </button>
                <button
                  type="button"
                  className="modern-btn secondary"
                  onClick={() => void loadCases()}
                >
                  Refresh Cases
                </button>
              </div>
            </div>

            <div className="hero-profile-card">
              <span className="hero-avatar" aria-hidden="true">
                {userName
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "U"}
              </span>
              <div>
                <span className="review-label">Current focus</span>
                <strong>{stats.open} active case records</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-stat-grid" aria-label="Case summary">
            <article className="stat-card-modern">
              <span className="stat-icon teal">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </span>
              <div>
                <span>Total Reports</span>
                <strong>{stats.total}</strong>
              </div>
            </article>
            <article className="stat-card-modern">
              <span className="stat-icon amber">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
              <div>
                <span>Active Records</span>
                <strong>{stats.open}</strong>
              </div>
            </article>
            <article className="stat-card-modern">
              <span className="stat-icon blue">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <span>Resolved</span>
                <strong>{stats.resolved}</strong>
              </div>
            </article>
            <article className="stat-card-modern">
              <span className="stat-icon rose">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 10.5 12 3l9 7.5V21H3Z" />
                </svg>
              </span>
              <div>
                <span>Stations</span>
                <strong>{stats.stations}</strong>
              </div>
            </article>
          </section>


          <section className="panel user-case-section">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Submitted records</p>
                <h2>My Cases</h2>
                <p className="muted">
                  Latest missing date: {formatDate(stats.latestDate)}
                </p>
              </div>
              <button
                type="button"
                className="button ghost small"
                onClick={() => void loadCases()}
              >
                Refresh
              </button>
            </div>

            {status ? <p className="status-text">{status}</p> : null}

            <div className="case-grid-modern">
              {filteredCases.length === 0 ? (
                <div className="empty-state empty-panel">
                  {cases.length === 0
                    ? "No reports yet. Create your first missing person report to start tracking."
                    : "No reports match your search."}
                </div>
              ) : null}

              {filteredCases.map((item) => (
                <article key={item.case_id} className="case-tile">
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt={`${item.name ?? "Missing person"} case photo`}
                      className="case-tile-photo"
                    />
                  ) : (
                    <div className="case-tile-photo case-tile-placeholder">
                      No Photo
                    </div>
                  )}

                  <div className="case-tile-body">
                    <div>
                      <h3>{item.name ?? "Unnamed"}</h3>
                      <p className="muted">Case {item.case_id.slice(0, 10)}</p>
                    </div>
                    <div className="case-meta-row">
                      <span className={`status-badge ${statusTone(item.status)}`}>
                        {item.status ?? "unknown"}
                      </span>
                      <span>{formatDate(item.missing_date)}</span>
                    </div>
                    <button
                      type="button"
                      className="modern-btn primary"
                      onClick={() => void loadCaseDetail(item.case_id)}
                    >
                      View Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {selectedCaseId ? (
            <section className="panel case-detail-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Case detail</p>
                  <h2>Case {selectedCaseId.slice(0, 10)}</h2>
                </div>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => {
                    setSelectedCaseId(null);
                    setCaseDetail(null);
                    setDetailStatus("");
                  }}
                >
                  Close
                </button>
              </div>

              {detailLoading ? (
                <div className="loading-overlay">
                  <span className="spinner" />
                  Loading case details...
                </div>
              ) : null}

              {detailStatus ? <p className="status-text">{detailStatus}</p> : null}

              {caseDetail ? (
                <div className="detail-grid">
                  <DetailList
                    title="Basic Info"
                    rows={[
                      { label: "Name", value: caseDetail.basic_info?.name },
                      { label: "Age", value: caseDetail.basic_info?.age },
                      { label: "Gender", value: caseDetail.basic_info?.gender },
                      { label: "Category", value: caseDetail.basic_info?.category },
                      {
                        label: "Missing Date",
                        value: formatDate(caseDetail.basic_info?.missing_date),
                      },
                      {
                        label: "Missing Time",
                        value: caseDetail.basic_info?.missing_time,
                      },
                      {
                        label: "Lost Address",
                        value: caseDetail.basic_info?.lost_address,
                      },
                      {
                        label: "Permanent Address",
                        value: caseDetail.basic_info?.permanent_address,
                      },
                    ]}
                  />
                  <DetailList
                    title="Appearance"
                    rows={[
                      { label: "Height", value: caseDetail.physical_details?.height },
                      { label: "Weight", value: caseDetail.physical_details?.weight },
                      {
                        label: "Complexion",
                        value: caseDetail.physical_details?.complexion,
                      },
                      {
                        label: "Hair Color",
                        value: caseDetail.physical_details?.hair_color,
                      },
                      {
                        label: "Eye Color",
                        value: caseDetail.physical_details?.eye_color,
                      },
                      {
                        label: "Identifying Marks",
                        value: caseDetail.physical_details?.identifying_marks,
                      },
                    ]}
                  />
                  <DetailList
                    title="Clothing"
                    rows={[
                      { label: "Clothes", value: caseDetail.clothing_details?.clothes },
                      { label: "Footwear", value: caseDetail.clothing_details?.footwear },
                      {
                        label: "Accessories",
                        value: caseDetail.clothing_details?.accessories,
                      },
                    ]}
                  />
                  <DetailList
                    title="Family"
                    rows={[
                      { label: "Mother", value: caseDetail.family_details?.mother_name },
                      { label: "Father", value: caseDetail.family_details?.father_name },
                      {
                        label: "Guardian",
                        value: caseDetail.family_details?.guardian_name,
                      },
                      {
                        label: "Relation",
                        value:
                          caseDetail.family_details?.relation_with_complainant,
                      },
                    ]}
                  />
                  <DetailList
                    title="Complainant"
                    rows={[
                      { label: "Name", value: caseDetail.complainant_details?.name },
                      { label: "Phone", value: caseDetail.complainant_details?.phone },
                      { label: "Email", value: caseDetail.complainant_details?.email },
                      {
                        label: "Address",
                        value: caseDetail.complainant_details?.address,
                      },
                    ]}
                  />
                  <DetailList
                    title="Case"
                    rows={[
                      {
                        label: "Last Seen",
                        value: caseDetail.case_details?.last_seen_location,
                      },
                      {
                        label: "Suspected Kidnap",
                        value: caseDetail.case_details?.suspected_kidnap,
                      },
                      {
                        label: "Emergency Level",
                        value: caseDetail.case_details?.emergency_level,
                      },
                      {
                        label: "Police Station",
                        value:
                          selectedStation?.station_name ??
                          caseDetail.case_details?.police_station_id,
                      },
                      { label: "Status", value: caseDetail.system_data?.status },
                    ]}
                  />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === "report" ? (
        <div className="fade-in">
          <div className="section-title-row">
            <div>
              <h1 className="dashboard-title-modern">Report Missing Person</h1>
              <p className="dashboard-subtitle-modern">
                Progressive report form mapped to the backend case fields.
              </p>
            </div>
          </div>

          <ProgressiveReportForm
            stations={sortedStations}
            stationsLoading={stationsLoading}
            onSuccess={handleReportSuccess}
          />
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="fade-in">
          <div className="section-title-row">
            <div>
              <h1 className="dashboard-title-modern">Profile Settings</h1>
              <p className="dashboard-subtitle-modern">
                Keep your dashboard identity easy to recognize.
              </p>
            </div>
          </div>

          <section className="panel profile-panel">
            <form className="wizard-form" onSubmit={submitProfile}>
              <div className="profile-preview">
                <span className="hero-avatar compact-avatar" aria-hidden="true">
                  {userName
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U"}
                </span>
                <div className="profile-preview-info">
                  <strong>{userName || "User"}</strong>
                  <span>{profileEmail || "Email not added"}</span>
                </div>
              </div>

              <div className="form-grid">
                <label className="form-group">
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={userName}
                    onChange={(event) => {
                      setUserName(event.target.value);
                      setProfileStatus("");
                    }}
                  />
                </label>

                <label className="form-group">
                  <span>Email Address</span>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(event) => {
                      setProfileEmail(event.target.value);
                      setProfileStatus("");
                    }}
                    placeholder="name@example.com"
                  />
                </label>

                <label className="form-group full-span">
                  <span>Change Password</span>
                  <div className="password-wrapper">
                    <input
                      type={showProfilePassword ? "text" : "password"}
                      value={profilePassword}
                      onChange={(event) => {
                        setProfilePassword(event.target.value);
                        setProfileStatus("");
                      }}
                      placeholder="Enter a new password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowProfilePassword((current) => !current)}
                      aria-label={
                        showProfilePassword ? "Hide password" : "Show password"
                      }
                    >
                      <EyeIcon hidden={!showProfilePassword} />
                    </button>
                  </div>
                </label>
              </div>

              {profileStatus ? (
                <div className="form-status success">{profileStatus}</div>
              ) : null}

              <div className="wizard-actions">
                <span />
                <button type="submit" className="modern-btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
