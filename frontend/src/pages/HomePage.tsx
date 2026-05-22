import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";

type IconName =
  | "activity"
  | "arrow"
  | "building"
  | "camera"
  | "check"
  | "file"
  | "lock"
  | "scan"
  | "shield"
  | "upload"
  | "user"
  | "users";


const workflow = [
  {
    icon: "file" as const,
    title: "Report",
    description: "Citizens submit identity, appearance, family, location, and photo details.",
  },
  {
    icon: "building" as const,
    title: "Assign",
    description: "The case is routed to the selected police station for follow-up.",
  },
  {
    icon: "scan" as const,
    title: "Match",
    description: "Police upload found-person photos and compare embeddings against active cases.",
  },
  {
    icon: "check" as const,
    title: "Resolve",
    description: "Officers confirm or reject matches and update the case state.",
  },
];

const roleCards: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
    {
      icon: "user",
      title: "Citizen Reporting",
      description:
        "Easily report missing persons by uploading photos and providing details. Select your nearest police station and track case status in real-time.",
    },
    {
      icon: "scan",
      title: "AI Face Matching",
      description:
        "Police can run advanced face recognition on found persons against the missing persons database with high accuracy similarity scores.",

    },
    {
      icon: "shield",
      title: "Admin Oversight",
      description:
        "Admins monitor the platform activity, manage police station accounts,manage users and ensure smooth operations across the entire system.",

    },
  ];

function RoleCard({
  icon,
  title,
  description,
  index,
}: (typeof roleCards)[number] & { index: number }) {
  return (
    <Reveal className="home-role-card" delay={index * 110}>
      <span className="home-card-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </Reveal>
  );
}

const aiFacts = [
  "InsightFace ArcFace model",
  "Cosine similarity scoring",
  "Top match candidates returned",
];

const trustPoints = [
  "Role-based access for citizens, police, and admins",
  "JWT-protected dashboard routes",
  "Station-only access to assigned police cases",
  "Face embeddings stored with case records for matching",
];

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
    case "arrow":
      return (
        <svg {...commonProps}>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
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
    case "file":
      return (
        <svg {...commonProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
    case "lock":
      return (
        <svg {...commonProps}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
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
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.8" />
          <path d="M16 3.2a4 4 0 0 1 0 7.6" />
        </svg>
      );
  }
}


function SectionIntro({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Reveal className="home-section-intro">
      <span className="section-tag">{tag}</span>
      <h2 className="section-title">{title}</h2>
      <p className="section-subtitle">{subtitle}</p>
    </Reveal>
  );
}

function WorkflowStep({
  icon,
  title,
  description,
  index,
}: (typeof workflow)[number] & { index: number }) {
  return (
    <Reveal className="home-workflow-step" delay={index * 90}>
      <span className="home-step-number">{String(index + 1).padStart(2, "0")}</span>
      <span className="home-card-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </Reveal>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`home-reveal ${isVisible ? "is-visible" : ""} ${className}`}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}


export default function HomePage() {
  return (
    <Layout>
      <div className="home-page-shell">
        <section className="hero-section">
          <div className="hero-bg">
            <div className="hero-gradient"></div>
            <div className="hero-pattern"></div>
          </div>
          <Reveal className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              AI-Powered Face Recognition
            </div>
            <h1 className="hero-title">
              Find Missing Persons with
              <span className="highlight"> AI Precision</span>
            </h1>
            <p className="hero-description">
              A unified platform connecting citizens, police, and administrators in the fight against missing persons. Report, match, and reunite families using advanced face recognition technology.
            </p>
            <div className="hero-actions">
              <Link to="/user/auth" className="button primary large">
                <span>Report Missing Person</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/police/auth" className="button secondary large">
                Police Portal
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">99.2%</span>
                <span className="stat-label">Match Accuracy</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">24/7</span>
                <span className="stat-label">Platform Availability</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-value">Real-time</span>
                <span className="stat-label">Case Updates</span>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="features" className="home-section home-roles-section">
          <div className="section-container">
            <SectionIntro
              tag="Platform Features"
              title="Built for every step of the response"
              subtitle="Each dashboard focuses on the work that role actually needs to complete."
            />
            <div className="home-role-grid">
              {roleCards.map((card, index) => (
                <RoleCard key={card.title} {...card} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="ai-matching" className="home-section home-ai-section">
          <div className="section-container home-ai-grid">
            <Reveal className="home-ai-visual">
              <div className="ai-camera-tile">
                <Icon name="camera" />
                <span className="ai-scan-line" />
              </div>
              <div className="ai-match-panel">
                <span>Similarity</span>
                <strong>0.87</strong>
                <div>
                  <span style={{ width: "87%" }} />
                </div>
              </div>
            </Reveal>

            <Reveal className="home-ai-copy" delay={120}>
              <span className="section-tag">AI Matching</span>
              <h2 className="section-title">Face matching that supports investigation</h2>
              <p>
                The AI service generates face embeddings from uploaded photos and
                compares found-person images against stored missing-person
                embeddings. Officers still make the final confirm or reject
                decision.
              </p>
              <div className="home-ai-facts">
                {aiFacts.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="how-it-works" className="home-section home-workflow-section">
          <div className="section-container">
            <SectionIntro
              tag="Workflow"
              title="From report to verified outcome"
              subtitle="A structured process keeps important data available to the right people."
            />
            <div className="home-workflow-grid">
              {workflow.map((step, index) => (
                <WorkflowStep key={step.title} {...step} index={index} />
              ))}
            </div>
          </div>
        </section>

        

        <section id="security" className="home-section home-security-section">
          <div className="section-container home-security-grid">
            <Reveal className="home-security-copy">
              <span className="section-tag">Trust Layer</span>
              <h2 className="section-title">Designed around controlled access</h2>
              <p>
                Missing-person data is sensitive. The project separates access by
                role so citizens, police, and admins only see the workflows meant
                for them.
              </p>
            </Reveal>

            <div className="home-safeguard-grid">
              {trustPoints.map((item, index) => (
                <Reveal key={item} className="home-safeguard-card" delay={index * 90}>
                  <Icon name={index === 0 ? "users" : index === 1 ? "lock" : "shield"} />
                  <span>{item}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <Reveal className="cta-content">
            <h2 className="cta-title">Ready to Make a Difference?</h2>
            <p className="cta-description">
              Join the platform today and help reunite families with their loved ones
            </p>
            <div className="cta-actions">
              <Link to="/user/auth" className="button primary large">
                Citizen Access
              </Link>
              <Link to="/police/auth" className="button secondary large">
                Police Access
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </Layout>
  );
}
