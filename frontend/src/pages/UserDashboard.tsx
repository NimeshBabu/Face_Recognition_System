import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import DashboardTopBar from "../components/DashboardTopBar";

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

type ReportField =
  | "name"
  | "age"
  | "gender"
  | "missingDate"
  | "stationId"
  | "photo";

type ReportFieldErrors = Partial<Record<ReportField, string>>;

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

export default function UserDashboard() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [stations, setStations] = useState<PoliceStationOption[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState("");
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ReportFieldErrors>({});
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [missingDate, setMissingDate] = useState("");
  const [stationId, setStationId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const validateReport = (): ReportFieldErrors => {
    const errors: ReportFieldErrors = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    }

    const parsedAge = Number(age);
    if (!age.trim()) {
      errors.age = "Age is required";
    } else if (
      !Number.isFinite(parsedAge) ||
      parsedAge < 1 ||
      parsedAge > 120
    ) {
      errors.age = "Age must be between 1 and 120";
    }

    if (!gender.trim()) {
      errors.gender = "Gender is required";
    }

    if (!missingDate.trim()) {
      errors.missingDate = "Missing date is required";
    } else if (missingDate > new Date().toISOString().slice(0, 10)) {
      errors.missingDate = "Missing date cannot be in the future";
    }

    if (!stationId.trim()) {
      errors.stationId = "Please select a police station";
    }

    if (!photo) {
      errors.photo = "Photo is required";
    }

    return errors;
  };

  const loadCases = async () => {
    try {
      const response = await api.get(`${API_PATHS.user}/my-cases`);
      setCases(response.data?.cases ?? []);
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  const loadStations = async () => {
    setStationsLoading(true);
    setStationsError("");

    try {
      const response = await api.get(`${API_PATHS.user}/police-stations`);
      setStations(response.data?.stations ?? []);
    } catch (error) {
      setStations([]);
      setStationsError(getErrorMessage(error));
    } finally {
      setStationsLoading(false);
    }
  };

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

  useEffect(() => {
    void loadCases();
    void loadStations();
  }, []);

  const submitMissingReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");
    const nextErrors = validateReport();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const selectedPhoto = photo;

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("age", age.trim());
    formData.append("gender", gender);
    formData.append("missing_date", missingDate);
    formData.append("police_station_id", stationId.trim());
    formData.append("photo", selectedPhoto as File);

    try {
      const response = await api.post(
        `${API_PATHS.user}/report-missing`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setStatus(response.data?.message ?? "Case submitted");
      setName("");
      setAge("");
      setGender("");
      setMissingDate("");
      setStationId("");
      setPhoto(null);
      setFieldErrors({});
      await loadCases();
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  return (
    <main className="page-shell">
      <DashboardTopBar
        role="user"
        title="User Dashboard"
        subtitle="Report missing persons and track your submitted cases"
      />

      <section className="two-col">
        <section className="panel">
          <p className="eyebrow">Report Intake</p>
          <h2>Report Missing Person</h2>

          <form className="stack" onSubmit={submitMissingReport}>
            <label>
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              {fieldErrors.name ? (
                <span className="field-error">{fieldErrors.name}</span>
              ) : null}
            </label>
            <label>
              Age
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                aria-invalid={Boolean(fieldErrors.age)}
                required
              />
              {fieldErrors.age ? (
                <span className="field-error">{fieldErrors.age}</span>
              ) : null}
            </label>
            <label>
              Gender
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                aria-invalid={Boolean(fieldErrors.gender)}
                required
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {fieldErrors.gender ? (
                <span className="field-error">{fieldErrors.gender}</span>
              ) : null}
            </label>
            <label>
              Missing Date
              <input
                type="date"
                value={missingDate}
                onChange={(e) => setMissingDate(e.target.value)}
                aria-invalid={Boolean(fieldErrors.missingDate)}
                required
              />
              {fieldErrors.missingDate ? (
                <span className="field-error">{fieldErrors.missingDate}</span>
              ) : null}
            </label>
            <label>
              Police Station
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                aria-invalid={Boolean(fieldErrors.stationId)}
                disabled={stationsLoading || sortedStations.length === 0}
                required
              >
                <option value="">
                  {stationsLoading
                    ? "Loading stations..."
                    : sortedStations.length === 0
                      ? "No stations available"
                      : "Select station"}
                </option>
                {sortedStations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name ?? "Unnamed station"}
                    {station.location ? ` (${station.location})` : ""}
                  </option>
                ))}
              </select>
              {stationsError ? (
                <span className="field-error">{stationsError}</span>
              ) : null}
              {fieldErrors.stationId ? (
                <span className="field-error">{fieldErrors.stationId}</span>
              ) : null}
            </label>
            <label>
              Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                aria-invalid={Boolean(fieldErrors.photo)}
                required
              />
              {fieldErrors.photo ? (
                <span className="field-error">{fieldErrors.photo}</span>
              ) : null}
            </label>

            <button type="submit" className="button primary">
              Submit Report
            </button>
          </form>

          <div className="row-wrap">
            <button
              type="button"
              className="button secondary"
              onClick={() => void loadCases()}
            >
              Refresh Cases
            </button>
          </div>

          {status ? <p className="status-text">{status}</p> : null}
        </section>

        <section className="panel">
          <p className="eyebrow">Your Cases</p>
          <h2>Submitted Records</h2>

          <div className="list-wrap">
            {cases.length === 0 ? (
              <p className="muted">No cases found yet.</p>
            ) : null}
            {cases.map((item) => (
              <article key={item.case_id} className="list-card case-card">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={`${item.name ?? "Missing person"} case photo`}
                    className="case-photo"
                  />
                ) : (
                  <div className="case-photo case-photo-placeholder">
                    No Photo
                  </div>
                )}
                <div className="case-content">
                  <h3>{item.name ?? "Unnamed"}</h3>
                  <p>Case ID: {item.case_id}</p>
                  <p>Status: {item.status ?? "n/a"}</p>
                  <p>Missing Date: {item.missing_date ?? "n/a"}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
