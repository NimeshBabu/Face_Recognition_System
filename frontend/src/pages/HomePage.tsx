import { Link } from "react-router-dom";
import Layout from "../components/Layout";

const features = [
  {
    icon: "👤",
    title: "Citizen Reporting",
    description: "Easily report missing persons by uploading photos and providing details. Select your nearest police station and track case status in real-time.",
    link: "/user/auth",
    linkText: "Get Started",
  },
  {
    icon: "🔍",
    title: "AI Face Matching",
    description: "Police can run advanced face recognition on found persons against the missing persons database with high accuracy similarity scores.",
    link: "/police/auth",
    linkText: "Access Portal",
  },
  {
    icon: "🛡️",
    title: "Admin Oversight",
    description: "Admins monitor platform activity, manage police station accounts, and ensure smooth operations across the entire system.",
    link: "/admin/auth",
    linkText: "Admin Login",
  },
];

const steps = [
  {
    number: "01",
    title: "Report",
    description: "Citizens submit a missing person report with photo and details",
  },
  {
    number: "02",
    title: "Match",
    description: "Police use AI face recognition to find potential matches",
  },
  {
    number: "03",
    title: "Verify",
    description: "Officers confirm or reject matches based on visual verification",
  },
  {
    number: "04",
    title: "Resolve",
    description: "Cases are updated and families are notified of outcomes",
  },
];

export default function HomePage() {
  return (
    <Layout>
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>
        <div className="hero-content">
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
                <path d="M5 12h14M12 5l7 7-7 7"/>
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
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Platform Features</span>
            <h2 className="section-title">Three Roles, One Mission</h2>
            <p className="section-subtitle">
              Designed for every stakeholder in the missing person resolution process
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <article key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
                <Link to={feature.link} className="feature-link">
                  {feature.linkText} <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="steps-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Workflow</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              A streamlined process from report to resolution
            </p>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div key={index} className="step-item">
                <div className="step-number">{step.number}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
                {index < steps.length - 1 && <div className="step-connector"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
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
        </div>
      </section>
    </Layout>
  );
}