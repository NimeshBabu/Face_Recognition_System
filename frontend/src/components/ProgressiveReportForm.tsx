import { useState, type ChangeEvent, type FormEvent } from "react";
import { AxiosError } from "axios";
import { api, API_PATHS } from "../lib/api";

interface PoliceStationOption {
  station_id: string;
  station_name?: string;
  location?: string;
}

interface ProgressiveReportFormProps {
  stations: PoliceStationOption[];
  stationsLoading: boolean;
  onSuccess: () => void;
}

type ReportField =
  | "name"
  | "age"
  | "gender"
  | "category"
  | "missing_date"
  | "missing_time"
  | "lost_address"
  | "permanent_address"
  | "height"
  | "weight"
  | "complexion"
  | "hair_color"
  | "eye_color"
  | "identifying_marks"
  | "clothes"
  | "footwear"
  | "accessories"
  | "mother_name"
  | "father_name"
  | "guardian_name"
  | "relation_with_complainant"
  | "complainant_name"
  | "complainant_phone"
  | "complainant_email"
  | "complainant_address"
  | "last_seen_location"
  | "suspected_kidnap"
  | "emergency_level"
  | "police_station_id";

type ReportFormState = Record<ReportField, string>;
type FormErrors = Partial<Record<ReportField | "photo", string>>;

const initialFormState: ReportFormState = {
  name: "",
  age: "",
  gender: "",
  category: "adult",
  missing_date: "",
  missing_time: "",
  lost_address: "",
  permanent_address: "",
  height: "",
  weight: "",
  complexion: "",
  hair_color: "",
  eye_color: "",
  identifying_marks: "",
  clothes: "",
  footwear: "",
  accessories: "",
  mother_name: "",
  father_name: "",
  guardian_name: "",
  relation_with_complainant: "",
  complainant_name: "",
  complainant_phone: "",
  complainant_email: "",
  complainant_address: "",
  last_seen_location: "",
  suspected_kidnap: "false",
  emergency_level: "high",
  police_station_id: "",
};

const steps = [
  {
    id: 1,
    title: "Identity",
    description: "Name, age, and missing timeline",
  },
  {
    id: 2,
    title: "Appearance",
    description: "Physical and clothing details",
  },
  {
    id: 3,
    title: "Contacts",
    description: "Family and complainant details",
  },
  {
    id: 4,
    title: "Assignment",
    description: "Case priority, station, and photo",
  },
] as const;

const requiredByStep: Record<number, Array<ReportField | "photo">> = {
  1: ["name", "age", "gender", "missing_date"],
  2: [],
  3: ["complainant_name", "complainant_phone"],
  4: ["police_station_id", "photo"],
};

const labels: Record<ReportField | "photo", string> = {
  name: "Full name",
  age: "Age",
  gender: "Gender",
  category: "Category",
  missing_date: "Missing date",
  missing_time: "Missing time",
  lost_address: "Lost address",
  permanent_address: "Permanent address",
  height: "Height",
  weight: "Weight",
  complexion: "Complexion",
  hair_color: "Hair color",
  eye_color: "Eye color",
  identifying_marks: "Identifying marks",
  clothes: "Clothes worn",
  footwear: "Footwear",
  accessories: "Accessories",
  mother_name: "Mother's name",
  father_name: "Father's name",
  guardian_name: "Guardian name",
  relation_with_complainant: "Relation with complainant",
  complainant_name: "Complainant name",
  complainant_phone: "Complainant phone",
  complainant_email: "Complainant email",
  complainant_address: "Complainant address",
  last_seen_location: "Last seen location",
  suspected_kidnap: "Suspected kidnapping",
  emergency_level: "Emergency level",
  police_station_id: "Police station",
  photo: "Recent photo",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return String(error.response?.data?.error ?? error.message);
  }
  return "Request failed";
}

function CompletedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function ProgressiveReportForm({
  stations,
  stationsLoading,
  onSuccess,
}: ProgressiveReportFormProps) {
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<ReportFormState>(initialFormState);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField =
    (field: ReportField) =>
    (
      event:
        | ChangeEvent<HTMLInputElement>
        | ChangeEvent<HTMLSelectElement>
        | ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setFields((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const validateStep = (currentStep: number) => {
    const nextErrors: FormErrors = {};

    requiredByStep[currentStep].forEach((field) => {
      if (field === "photo") {
        if (!photo) {
          nextErrors.photo = `${labels.photo} is required`;
        }
        return;
      }

      if (!fields[field].trim()) {
        nextErrors[field] = `${labels[field]} is required`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const nextErrors: FormErrors = {};

    Object.keys(requiredByStep).forEach((stepKey) => {
      requiredByStep[Number(stepKey)].forEach((field) => {
        if (field === "photo") {
          if (!photo) {
            nextErrors.photo = `${labels.photo} is required`;
          }
          return;
        }

        if (!fields[field].trim()) {
          nextErrors[field] = `${labels[field]} is required`;
        }
      });
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) {
      setStep((current) => Math.min(current + 1, steps.length));
      setStatus("");
    }
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 1));
    setStatus("");
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateAll()) {
      setStatus("Please complete the highlighted required fields.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    if (photo) {
      formData.append("photo", photo);
    }

    try {
      await api.post(`${API_PATHS.user}/report-missing`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("Case submitted successfully.");
      setTimeout(() => {
        onSuccess();
      }, 700);
    } catch (error) {
      setStatus(getErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  const currentStep = steps[step - 1];
  const progress = (step / steps.length) * 100;

  return (
    <div className="wizard-container report-wizard">
      <div className="wizard-heading">
        <div>
          <p className="eyebrow">Missing person report</p>
          <h2>{currentStep.title}</h2>
          <p className="muted">{currentStep.description}</p>
        </div>
        <span className="wizard-count">
          Step {step} of {steps.length}
        </span>
      </div>

      <div className="wizard-progressbar" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="wizard-steps">
        {steps.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`wizard-step ${step === item.id ? "active" : ""} ${
              step > item.id ? "completed" : ""
            }`}
            onClick={() => {
              if (item.id < step) {
                setStep(item.id);
              }
            }}
            aria-current={step === item.id ? "step" : undefined}
          >
            <span className="step-indicator">
              {step > item.id ? <CompletedIcon /> : item.id}
            </span>
            <span className="step-copy">
              <span className="step-label">{item.title}</span>
              <span className="step-description">{item.description}</span>
            </span>
          </button>
        ))}
      </div>

      <form className="wizard-form" onSubmit={submitForm}>
        {step === 1 ? (
          <div className="form-grid">
            <label className="form-group">
              <span>Full Name *</span>
              <input
                value={fields.name}
                onChange={updateField("name")}
                aria-invalid={Boolean(errors.name)}
                placeholder="Enter full legal name"
              />
              {errors.name ? <span className="field-error">{errors.name}</span> : null}
            </label>

            <label className="form-group">
              <span>Age *</span>
              <input
                type="number"
                min="0"
                value={fields.age}
                onChange={updateField("age")}
                aria-invalid={Boolean(errors.age)}
                placeholder="Age in years"
              />
              {errors.age ? <span className="field-error">{errors.age}</span> : null}
            </label>

            <label className="form-group">
              <span>Gender *</span>
              <select
                value={fields.gender}
                onChange={updateField("gender")}
                aria-invalid={Boolean(errors.gender)}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender ? <span className="field-error">{errors.gender}</span> : null}
            </label>

            <label className="form-group">
              <span>Category</span>
              <select value={fields.category} onChange={updateField("category")}>
                <option value="adult">Adult</option>
                <option value="child">Child</option>
                <option value="senior">Senior</option>
              </select>
            </label>

            <label className="form-group">
              <span>Missing Date *</span>
              <input
                type="date"
                value={fields.missing_date}
                onChange={updateField("missing_date")}
                aria-invalid={Boolean(errors.missing_date)}
              />
              {errors.missing_date ? (
                <span className="field-error">{errors.missing_date}</span>
              ) : null}
            </label>

            <label className="form-group">
              <span>Missing Time</span>
              <input
                type="time"
                value={fields.missing_time}
                onChange={updateField("missing_time")}
              />
            </label>

            <label className="form-group full-span">
              <span>Lost Address</span>
              <textarea
                rows={3}
                value={fields.lost_address}
                onChange={updateField("lost_address")}
                placeholder="Where was the person last known to be missing from?"
              />
            </label>

            <label className="form-group full-span">
              <span>Permanent Address</span>
              <textarea
                rows={3}
                value={fields.permanent_address}
                onChange={updateField("permanent_address")}
                placeholder="Permanent home address"
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-grid">
            <label className="form-group">
              <span>Height</span>
              <input
                value={fields.height}
                onChange={updateField("height")}
                placeholder="e.g. 170 cm"
              />
            </label>

            <label className="form-group">
              <span>Weight</span>
              <input
                value={fields.weight}
                onChange={updateField("weight")}
                placeholder="e.g. 65 kg"
              />
            </label>

            <label className="form-group">
              <span>Complexion</span>
              <input
                value={fields.complexion}
                onChange={updateField("complexion")}
                placeholder="Skin tone or complexion"
              />
            </label>

            <label className="form-group">
              <span>Hair Color</span>
              <input
                value={fields.hair_color}
                onChange={updateField("hair_color")}
                placeholder="Hair color"
              />
            </label>

            <label className="form-group">
              <span>Eye Color</span>
              <input
                value={fields.eye_color}
                onChange={updateField("eye_color")}
                placeholder="Eye color"
              />
            </label>

            <label className="form-group full-span">
              <span>Identifying Marks</span>
              <textarea
                rows={3}
                value={fields.identifying_marks}
                onChange={updateField("identifying_marks")}
                placeholder="Scars, birthmarks, tattoos, or other unique marks"
              />
            </label>

            <label className="form-group">
              <span>Clothes Worn</span>
              <input
                value={fields.clothes}
                onChange={updateField("clothes")}
                placeholder="Clothing at last sighting"
              />
            </label>

            <label className="form-group">
              <span>Footwear</span>
              <input
                value={fields.footwear}
                onChange={updateField("footwear")}
                placeholder="Shoes, sandals, or other footwear"
              />
            </label>

            <label className="form-group full-span">
              <span>Accessories</span>
              <textarea
                rows={3}
                value={fields.accessories}
                onChange={updateField("accessories")}
                placeholder="Bag, watch, jewelry, phone, glasses, or other accessories"
              />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-grid">
            <label className="form-group">
              <span>Mother's Name</span>
              <input value={fields.mother_name} onChange={updateField("mother_name")} />
            </label>

            <label className="form-group">
              <span>Father's Name</span>
              <input value={fields.father_name} onChange={updateField("father_name")} />
            </label>

            <label className="form-group">
              <span>Guardian Name</span>
              <input value={fields.guardian_name} onChange={updateField("guardian_name")} />
            </label>

            <label className="form-group">
              <span>Relation with Complainant</span>
              <input
                value={fields.relation_with_complainant}
                onChange={updateField("relation_with_complainant")}
                placeholder="e.g. parent, sibling, neighbor"
              />
            </label>

            <label className="form-group">
              <span>Complainant Name *</span>
              <input
                value={fields.complainant_name}
                onChange={updateField("complainant_name")}
                aria-invalid={Boolean(errors.complainant_name)}
              />
              {errors.complainant_name ? (
                <span className="field-error">{errors.complainant_name}</span>
              ) : null}
            </label>

            <label className="form-group">
              <span>Complainant Phone *</span>
              <input
                type="tel"
                value={fields.complainant_phone}
                onChange={updateField("complainant_phone")}
                aria-invalid={Boolean(errors.complainant_phone)}
              />
              {errors.complainant_phone ? (
                <span className="field-error">{errors.complainant_phone}</span>
              ) : null}
            </label>

            <label className="form-group">
              <span>Complainant Email</span>
              <input
                type="email"
                value={fields.complainant_email}
                onChange={updateField("complainant_email")}
              />
            </label>

            <label className="form-group full-span">
              <span>Complainant Address</span>
              <textarea
                rows={3}
                value={fields.complainant_address}
                onChange={updateField("complainant_address")}
              />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form-grid">
            <label className="form-group full-span">
              <span>Last Seen Location</span>
              <textarea
                rows={3}
                value={fields.last_seen_location}
                onChange={updateField("last_seen_location")}
                placeholder="Landmark, area, route, or coordinates if available"
              />
            </label>

            <label className="form-group">
              <span>Suspected Kidnapping</span>
              <select
                value={fields.suspected_kidnap}
                onChange={updateField("suspected_kidnap")}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>

            <label className="form-group">
              <span>Emergency Level</span>
              <select
                value={fields.emergency_level}
                onChange={updateField("emergency_level")}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="form-group">
              <span>Police Station *</span>
              <select
                value={fields.police_station_id}
                onChange={updateField("police_station_id")}
                disabled={stationsLoading}
                aria-invalid={Boolean(errors.police_station_id)}
              >
                <option value="">
                  {stationsLoading ? "Loading stations..." : "Select station"}
                </option>
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name ?? "Unnamed station"}
                    {station.location ? ` - ${station.location}` : ""}
                  </option>
                ))}
              </select>
              {errors.police_station_id ? (
                <span className="field-error">{errors.police_station_id}</span>
              ) : null}
            </label>

            <label className="form-group full-span">
              <span>Recent Photo *</span>
              <span className="photo-dropzone">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>
                  <strong>{photo ? photo.name : "Upload a clear face photo"}</strong>
                  <small>JPG, PNG, or WEBP up to the backend upload limit.</small>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setPhoto(event.target.files?.[0] ?? null);
                    setErrors((current) => ({ ...current, photo: undefined }));
                  }}
                />
              </span>
              {errors.photo ? <span className="field-error">{errors.photo}</span> : null}
            </label>

            <div className="report-review full-span">
              <div>
                <span className="review-label">Person</span>
                <strong>{fields.name || "Not added"}</strong>
              </div>
              <div>
                <span className="review-label">Missing Date</span>
                <strong>{fields.missing_date || "Not added"}</strong>
              </div>
              <div>
                <span className="review-label">Priority</span>
                <strong>{fields.emergency_level}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {status ? (
          <div
            className={`form-status ${
              status.includes("successfully") ? "success" : "error"
            }`}
          >
            {status}
          </div>
        ) : null}

        <div className="wizard-actions">
          <button
            type="button"
            className="modern-btn secondary"
            onClick={goBack}
            disabled={step === 1 || isSubmitting}
          >
            Back
          </button>

          {step < steps.length ? (
            <button type="button" className="modern-btn primary" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button type="submit" className="modern-btn primary" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
