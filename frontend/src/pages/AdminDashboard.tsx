import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AxiosError } from "axios";
import { API_PATHS, api } from "../lib/api";
import DashboardTopBar from "../components/DashboardTopBar";

interface AdminCase {
  case_id: string;
  name?: string;
  age?: number;
  status?: string;
  police_station_id?: string;
}

interface SimpleUser {
  user_id: string;
  name?: string;
  email?: string;
}

interface PoliceStation {
  station_id: string;
  station_name?: string;
  email?: string;
  location?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

export default function AdminDashboard() {
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [status, setStatus] = useState("");

  const [stationName, setStationName] = useState("");
  const [stationEmail, setStationEmail] = useState("");
  const [stationPassword, setStationPassword] = useState("");
  const [stationLocation, setStationLocation] = useState("");

  const loadData = async () => {
    try {
      const [caseRes, userRes, stationRes] = await Promise.all([
        api.get(`${API_PATHS.admin}/all-cases`),
        api.get(`${API_PATHS.admin}/users`),
        api.get(`${API_PATHS.admin}/police`),
      ]);

      setCases(caseRes.data?.cases ?? []);
      setUsers(userRes.data?.users ?? []);
      setStations(stationRes.data?.police_stations ?? []);
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createPoliceStation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await api.post(`${API_PATHS.admin}/create-police`, {
        station_name: stationName,
        email: stationEmail,
        password: stationPassword,
        location: stationLocation,
      });

      setStatus(response.data?.message ?? "Police station created");
      setStationName("");
      setStationEmail("");
      setStationPassword("");
      setStationLocation("");
      await loadData();
    } catch (error) {
      setStatus(getErrorMessage(error));
    }
  };

  return (
    <main className="page-shell">
      <DashboardTopBar
        role="admin"
        title="Admin Dashboard"
        subtitle="Monitor platform activity and manage police station access"
      />

      <section className="two-col">
        <section className="panel">
          <p className="eyebrow">Operations</p>
          <h2>System Overview</h2>

          <div className="stats-grid">
            <article className="stat-card">
              <span>Cases</span>
              <strong>{cases.length}</strong>
            </article>
            <article className="stat-card">
              <span>Users</span>
              <strong>{users.length}</strong>
            </article>
            <article className="stat-card">
              <span>Police Stations</span>
              <strong>{stations.length}</strong>
            </article>
          </div>

          <div className="row-wrap">
            <button
              type="button"
              className="button secondary"
              onClick={() => void loadData()}
            >
              Refresh
            </button>
          </div>

          <div className="list-wrap">
            {cases.map((item) => (
              <article key={item.case_id} className="list-card">
                <h3>{item.name ?? "Unnamed"}</h3>
                <p>Case ID: {item.case_id}</p>
                <p>Status: {item.status ?? "n/a"}</p>
                <p>Station: {item.police_station_id ?? "n/a"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <p className="eyebrow">Admin Actions</p>
          <h2>Create Police Station</h2>

          <form className="stack" onSubmit={createPoliceStation}>
            <label>
              Station Name
              <input
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={stationEmail}
                onChange={(e) => setStationEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={stationPassword}
                onChange={(e) => setStationPassword(e.target.value)}
                required
              />
            </label>
            <label>
              Location
              <input
                value={stationLocation}
                onChange={(e) => setStationLocation(e.target.value)}
              />
            </label>
            <button className="button primary" type="submit">
              Create Station
            </button>
          </form>

          <h3>Registered Police Stations</h3>
          <div className="list-wrap">
            {stations.map((item) => (
              <article key={item.station_id} className="list-card">
                <h4>{item.station_name ?? "Unnamed"}</h4>
                <p>ID: {item.station_id}</p>
                <p>Email: {item.email ?? "n/a"}</p>
                <p>Location: {item.location ?? "n/a"}</p>
              </article>
            ))}
          </div>

          {status ? <p className="status-text">{status}</p> : null}
        </section>
      </section>
    </main>
  );
}
