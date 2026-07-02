import { useEffect, useState, useRef ,type ChangeEvent, type FormEvent } from "react";
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
  | "police_station_id";

type ReportFormState = Record<ReportField, string>;
type FormErrors = Partial<Record<ReportField | "photo", string>>;

const initialFormState: ReportFormState = {
  name: "",
  age: "",
  gender: "",
  category: "",
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
  police_station_id: "",
};
const MAX_PHOTO_MB = 5; // match your backend limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
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
  const submitIntentRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const element = document.querySelector(".wizard-container");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

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
        setStatus("");
      };

  const validateFields = (
    fieldsToValidate: Partial<Record<ReportField | "photo", string>>,
    filesToValidate: { photo?: File | null },
    nextErrors: FormErrors
  ) => {
    // 1. Name validation
    if (fieldsToValidate.name !== undefined) {
      const nameVal = fieldsToValidate.name.trim();
      if (!nameVal) {
        nextErrors.name = "Full name is required";
      } else if (!/^[A-Za-z\s]+$/.test(nameVal)) {
        nextErrors.name = "Name must only contain letters and spaces";
      }
    }

    // 2. Age validation
    if (fieldsToValidate.age !== undefined) {
      const ageVal = fieldsToValidate.age.trim();
      if (!ageVal) {
        nextErrors.age = "Age is required";
      } else {
        const parsed = parseInt(ageVal, 10);
        if (isNaN(parsed) || parsed < 0 || parsed > 120 || String(parsed) !== ageVal) {
          nextErrors.age = "Age must be an integer between 0 and 120";
        }
      }
    }

    // 3. Gender validation
    if (fieldsToValidate.gender !== undefined) {
      if (!fieldsToValidate.gender.trim()) {
        nextErrors.gender = "Gender is required";
      }
    }

    // 4. Missing date validation
    if (fieldsToValidate.missing_date !== undefined) {
      const dateVal = fieldsToValidate.missing_date.trim();
      if (!dateVal) {
        nextErrors.missing_date = "Missing date is required";
      } else {
        const inputDate = new Date(dateVal);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Allow today's date completely
        if (inputDate > today) {
          nextErrors.missing_date = "Missing date cannot be in the future";
        }
      }
    }

    // 5. Complainant Name validation
    if (fieldsToValidate.complainant_name !== undefined) {
      const cNameVal = fieldsToValidate.complainant_name.trim();
      if (!cNameVal) {
        nextErrors.complainant_name = "Complainant name is required";
      } else if (!/^[A-Za-z\s]+$/.test(cNameVal)) {
        nextErrors.complainant_name = "Complainant name must only contain letters and spaces";
      }
    }

    // 6. Complainant Phone validation
    if (fieldsToValidate.complainant_phone !== undefined) {
      const phoneVal = fieldsToValidate.complainant_phone.trim();
      if (!phoneVal) {
        nextErrors.complainant_phone = "Complainant phone is required";
      } else if (!/^\d{10}$/.test(phoneVal)) {
        nextErrors.complainant_phone = "Phone must be exactly 10 digits";
      }
    }

    // 7. Complainant Email validation (only when a value is present)
    if (fieldsToValidate.complainant_email !== undefined) {
      const emailVal = fieldsToValidate.complainant_email.trim();
      if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        nextErrors.complainant_email = "Please enter a valid email address (e.g. name@example.com)";
      }
    }

    // 8. Police Station id validation
    if (fieldsToValidate.police_station_id !== undefined) {
      if (!fieldsToValidate.police_station_id.trim()) {
        nextErrors.police_station_id = "Police station is required";
      }
    }

    // 9. Photo validation
    if (filesToValidate.hasOwnProperty("photo")) {
      if (!filesToValidate.photo) {
        nextErrors.photo = "Recent photo is required";
      }
    }
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: FormErrors = {};

    const fieldsToValidate: Partial<Record<ReportField | "photo", string>> = {};
    const filesToValidate: { photo?: File | null } = {};

    requiredByStep[currentStep].forEach((field) => {
      if (field === "photo") {
        filesToValidate.photo = photo;
      } else {
        fieldsToValidate[field] = fields[field];
      }
    });

    // Also check optional email format if on step 3 and user has typed something
    if (currentStep === 3 && fields.complainant_email.trim()) {
      fieldsToValidate.complainant_email = fields.complainant_email;
    }

    validateFields(fieldsToValidate, filesToValidate, nextErrors);

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = (): FormErrors => {
    const nextErrors: FormErrors = {};
    validateFields({ ...fields }, { photo }, nextErrors);
    setErrors(nextErrors);
    return nextErrors;
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


  const stepFieldMap: Record<number, Array<ReportField | "photo">> = {
    1: ["name", "age", "gender", "category", "missing_date", "missing_time", "lost_address", "permanent_address"],
    2: ["height", "weight", "complexion", "hair_color", "eye_color", "identifying_marks", "clothes", "footwear", "accessories"],
    3: ["mother_name", "father_name", "guardian_name", "relation_with_complainant", "complainant_name", "complainant_phone", "complainant_email", "complainant_address"],
    4: ["last_seen_location", "suspected_kidnap", "police_station_id", "photo"],
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;

    const target = event.target as HTMLElement;

    // Allow Enter inside a <textarea> to insert a newline, not submit
    if (target.tagName === "TEXTAREA") return;

    // Never let Enter silently submit the whole form
    event.preventDefault();

    // On non-final steps, treat Enter like clicking "Continue"
    if (step < steps.length) {
      goNext();
    }
    // On the final step, do nothing — force an explicit click on "Submit Report"
  };


  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!submitIntentRef.current){
      return;
    }
    submitIntentRef.current = false;
    
    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) {
      setStatus("Some required fields need attention — check the highlighted steps.");
      const erroredKeys = Object.keys(validationErrors) as Array<ReportField | "photo">;
      const firstBadStep = Object.entries(stepFieldMap).find(([, fieldsInStep]) =>
        fieldsInStep.some((f) => erroredKeys.includes(f)),
      );
      if (firstBadStep) setStep(Number(firstBadStep[0]));
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      // Append cm/kg units to height and weight when sending to DB
      if (key === "height" && value.trim()) {
        formData.append(key, `${value.trim()} cm`);
      } else if (key === "weight" && value.trim()) {
        formData.append(key, `${value.trim()} kg`);
      } else {
        formData.append(key, typeof value === "string" ? value.trim() : value);
      }
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
            className={`wizard-step ${step === item.id ? "active" : ""} ${step > item.id ? "completed" : ""
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

      <form className="wizard-form" onSubmit={submitForm} onKeyDown={handleFormKeyDown} noValidate>
        {step === 1 ? (
          <div className="form-grid">
            <label className="form-group">
              <span>Full Name *</span>
              <input
                value={fields.name}
                onChange={updateField("name")}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "name-error" : undefined}
                placeholder="Enter full legal name"
              />
              {errors.name ? <span id="name-error" className="field-error" role="alert">{errors.name}</span> : null}
            </label>

            <label className="form-group">
              <span>Age *</span>
              <input
                type="number"
                min="0"
                max="120"
                value={fields.age}
                onChange={(e) => {
                  let value = e.target.value;

                  // Strip leading zeros (but allow a single "0")
                  if (value.length > 1) {
                    value = value.replace(/^0+/, "") || "0";
                  }

                  if (value === "" || /^\d{1,3}$/.test(value)) {
                    setFields((current) => ({ ...current, age: value }));
                    setErrors((current) => ({ ...current, age: undefined }));
                    setStatus("");
                  }
                }}
                aria-invalid={Boolean(errors.age)}
                aria-describedby={errors.age ? "age-error" : undefined}
                placeholder="Age in years"
              />
              {errors.age ? <span id="age-error" className="field-error" role="alert">{errors.age}</span> : null}
            </label>

            <label className="form-group">
              <span>Gender *</span>
              <select
                value={fields.gender}
                onChange={updateField("gender")}
                aria-invalid={Boolean(errors.gender)}
                aria-describedby={errors.gender ? "gender-error" : undefined}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender ? <span id="gender-error" className="field-error" role="alert">{errors.gender}</span> : null}
            </label>

            <label className="form-group">
              <span>Category</span>
              <select value={fields.category} onChange={updateField("category")}>
                <option value="">Select Category</option>
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
                aria-describedby={errors.missing_date ? "missing_date-error" : undefined}
              />
              {errors.missing_date ? (
                <span id="missing_date-error" className="field-error" role="alert">{errors.missing_date}</span>
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
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  min="0"
                  value={fields.height}
                  onChange={(e) => {
                    // Allow only non-negative numbers
                    if (e.target.value === "" || /^\d+(\.\d*)?$/.test(e.target.value)) {
                      updateField("height")(e);
                    }
                  }}
                  placeholder="e.g. 170"
                  style={{ paddingRight: "2.8rem" }}
                />
                <span style={{ position: "absolute", right: "10px", color: "var(--muted, #888)", pointerEvents: "none", fontWeight: 600 }}>cm</span>
              </div>
            </label>

            <label className="form-group">
              <span>Weight</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="number"
                  min="0"
                  value={fields.weight}
                  onChange={(e) => {
                    if (e.target.value === "" || /^\d+(\.\d*)?$/.test(e.target.value)) {
                      updateField("weight")(e);
                    }
                  }}
                  placeholder="e.g. 65"
                  style={{ paddingRight: "2.8rem" }}
                />
                <span style={{ position: "absolute", right: "10px", color: "var(--muted, #888)", pointerEvents: "none", fontWeight: 600 }}>kg</span>
              </div>
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
                aria-describedby={errors.complainant_name ? "complainant_name-error" : undefined}
              />
              {errors.complainant_name ? (
                <span id="complainant_name-error" className="field-error" role="alert">{errors.complainant_name}</span>
              ) : null}
            </label>

            <label className="form-group">
              <span>Complainant Phone *</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={fields.complainant_phone}
                onChange={(e) => {
                  // Allow only digits, max 10
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setFields((current) => ({ ...current, complainant_phone: digits }));
                  setErrors((current) => ({ ...current, complainant_phone: undefined }));
                  setStatus("");
                }}
                aria-invalid={Boolean(errors.complainant_phone)}
                aria-describedby={errors.complainant_phone ? "complainant_phone-error" : undefined}
                placeholder="10-digit mobile number"
              />
              {errors.complainant_phone ? (
                <span id="complainant_phone-error" className="field-error" role="alert">{errors.complainant_phone}</span>
              ) : null}
            </label>

            <label className="form-group">
              <span>Complainant Email *</span>
              <input
                type="email"
                value={fields.complainant_email}
                onChange={updateField("complainant_email")}
                aria-invalid={Boolean(errors.complainant_email)}
                aria-describedby={errors.complainant_email ? "complainant_email-error" : undefined}
                placeholder="e.g. name@example.com"
              />
              {errors.complainant_email ? (
                <span id="complainant_email-error" className="field-error" role="alert">{errors.complainant_email}</span>
              ) : null}
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
              <span>Police Station *</span>
              <select
                value={fields.police_station_id}
                onChange={updateField("police_station_id")}
                disabled={stationsLoading}
                aria-invalid={Boolean(errors.police_station_id)}
                aria-describedby={errors.police_station_id ? "police_station_id-error" : undefined}
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
                <span id="police_station_id-error" className="field-error" role="alert">{errors.police_station_id}</span>
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
                  <small>JPG/JPEG, PNG, or WEBP up to the {MAX_PHOTO_MB}MB.</small>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  aria-invalid={Boolean(errors.photo)}
                  aria-describedby={errors.photo ? "photo-error" : undefined}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    if (file) {
                      if (!ALLOWED_TYPES.includes(file.type)) {
                        setErrors((current) => ({ ...current, photo: "Only JPG, PNG, or WEBP images are allowed" }));
                        setPhoto(null);
                        return;
                      }
                      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
                        setErrors((current) => ({ ...current, photo: `Photo must be under ${MAX_PHOTO_MB}MB` }));
                        setPhoto(null);
                        return;
                      }
                    }

                    setPhoto(file);
                    setErrors((current) => ({ ...current, photo: undefined }));
                    setStatus("");
                  }}
                />
              </span>
              {errors.photo ? <span id="photo-error" className="field-error" role="alert">{errors.photo}</span> : null}
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
            </div>
          </div>
        ) : null}

        {status ? (
          <div
            className={`form-status ${status.includes("successfully") ? "success" : "error"
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
            <button type="submit" className="modern-btn primary" disabled={isSubmitting}
            onClick={()=>{submitIntentRef.current = true;}}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
