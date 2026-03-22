import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import DashboardTopBar from "../components/DashboardTopBar";

interface PoliceCase {
  case_id: string;
  name?: string;
  age?: number;
  gender?: string;
  status?: string;
  photo_url?: string | null;
}

interface MatchLog {
  log_id: string;
  case_id: string;
  similarity_score: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

export default function PoliceDashboard() {
  const [cases, setCases] = useState<PoliceCase[]>([]);
  const [status, setStatus] = useState("");
  const [caseId, setCaseId] = useState("");
  const [caseDetail, setCaseDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [matches, setMatches] = useState<MatchLog[]>([]);

  const loadCases = async () => {
    try {
      const response = await api.get(`${API_PATHS.police}/cases`);
      setCases(response.data?.cases ?? []);
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadCases();
  }, []);

  const loadCaseDetail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await api.get(`${API_PATHS.police}/case/${caseId}`);
      setCaseDetail(response.data?.case_data ?? null);
      setStatus("Case loaded");
    } catch (error) {
      setStatus(getErrorMessage(error));
      setCaseDetail(null);
    }
  };

  const runMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!photo) {
      setStatus("Photo is required for matching");
      return;
    }

    const formData = new FormData();
    formData.append("photo", photo);

    try {
      const response = await api.post(
        `${API_PATHS.match}/match-found`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setMatches(response.data?.matches ?? []);
      setStatus("Matching completed");
      setPhoto(null);
    } catch (error) {
      setStatus(getErrorMessage(error));
      setMatches([]);
    }
  };

  const updateMatchStatus = async (
    logId: string,
    action: "confirm-match" | "reject-match",
  ) => {
    try {
      const response = await api.post(`${API_PATHS.match}/${action}`, {
        log_id: logId,
      });
      setStatus(response.data?.message ?? "Updated");
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  return (
    <main className="page-shell">
      <DashboardTopBar
        role="police"
        title="Police Dashboard"
        subtitle="Manage assigned cases and process AI face match results"
      />

      <section className="two-col">
        <section className="panel">
          <p className="eyebrow">Case Queue</p>
          <h2>Assigned Cases</h2>

          <div className="list-wrap">
            {cases.length === 0 ? (
              <p className="muted">No assigned cases found.</p>
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
                  <p>Age: {item.age ?? "n/a"}</p>
                  <p>Gender: {item.gender ?? "n/a"}</p>
                  <p>Status: {item.status ?? "n/a"}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="row-wrap">
            <button
              type="button"
              className="button secondary"
              onClick={() => void loadCases()}
            >
              Refresh Cases
            </button>
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Actions</p>
          <h2>Case Detail + Match</h2>

          <form className="stack" onSubmit={loadCaseDetail}>
            <label>
              Case ID
              <input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                required
              />
            </label>
            <button className="button secondary" type="submit">
              Load Case
            </button>
          </form>

          {caseDetail ? (
            <pre className="json-box">
              {JSON.stringify(caseDetail, null, 2)}
            </pre>
          ) : null}

          <form className="stack" onSubmit={runMatch}>
            <label>
              Found Person Photo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                required
              />
            </label>
            <button className="button primary" type="submit">
              Run Face Match
            </button>
          </form>

          <div className="list-wrap">
            {matches.map((match) => (
              <article key={match.log_id} className="list-card">
                <h3>Case {match.case_id}</h3>
                <p>Log ID: {match.log_id}</p>
                <p>Similarity: {Number(match.similarity_score).toFixed(4)}</p>
                <div className="row-wrap">
                  <button
                    type="button"
                    className="button primary"
                    onClick={() =>
                      void updateMatchStatus(match.log_id, "confirm-match")
                    }
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() =>
                      void updateMatchStatus(match.log_id, "reject-match")
                    }
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>

          {status ? <p className="status-text">{status}</p> : null}
        </section>
      </section>
    </main>
  );
}
