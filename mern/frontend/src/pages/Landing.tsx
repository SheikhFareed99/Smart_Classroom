import { Link } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";
import {
  BookOpen,
  Users,
  Brain,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import "./Landing.css";

function Landing() {
  return (
    <>
      <ThemeToggle className="landing-toggle" />

      <div className="landing-page">
        {/* ---- Navigation Bar ---- */}
        <nav className="landing-nav">
          <div className="landing-nav-content">
            <div className="landing-logo">
              <div className="logo-icon">AI</div>
              <span className="logo-text">AI<span>Co</span></span>
            </div>
            <div className="landing-nav-links">
              <a href="#features" className="nav-link">Features</a>
              <Link to="/login" className="nav-link nav-link-login">
                Login or Sign Up
              </Link>
            </div>
          </div>
        </nav>

        {/* ---- Hero Section ---- */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              <span>AI-Powered Learning Platform</span>
            </div>
            <h1 className="hero-title">
              Transform Your Classroom with
              <span className="hero-highlight"> AI Intelligence</span>
            </h1>
            <p className="hero-subtitle">
              Empower teachers and students with intelligent course management,
              automated assignments, real-time collaboration, and AI-driven insights.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn btn-primary btn-lg">
                Login or Sign Up
                <ArrowRight size={20} />
              </Link>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Active Students</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">500+</span>
                <span className="stat-label">Courses Created</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">Satisfaction Rate</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card hero-card-1">
              <Brain size={24} />
              <span>AI Assistant</span>
            </div>
            <div className="hero-card hero-card-2">
              <BarChart3 size={24} />
              <span>Analytics</span>
            </div>
            <div className="hero-card hero-card-3">
              <Users size={24} />
              <span>Collaboration</span>
            </div>
          </div>
        </section>

        {/* ---- Features Section ---- */}
        <section id="features" className="features-section">
          <div className="section-content">
            <div className="section-header">
              <h2 className="section-title">Everything You Need to Succeed</h2>
              <p className="section-subtitle">
                Powerful tools designed for modern education
              </p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <BookOpen size={24} />
                </div>
                <h3 className="feature-title">Course Management</h3>
                <p className="feature-desc">
                  Create, organize, and manage courses with intuitive drag-and-drop tools.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Brain size={24} />
                </div>
                <h3 className="feature-title">AI-Powered Insights</h3>
                <p className="feature-desc">
                  Get intelligent recommendations and automated grading assistance.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Users size={24} />
                </div>
                <h3 className="feature-title">Real-Time Collaboration</h3>
                <p className="feature-desc">
                  Interactive jamboards and live collaboration tools for students.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 size={24} />
                </div>
                <h3 className="feature-title">Advanced Analytics</h3>
                <p className="feature-desc">
                  Track progress, identify trends, and improve outcomes with data.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Shield size={24} />
                </div>
                <h3 className="feature-title">Plagiarism Detection</h3>
                <p className="feature-desc">
                  Built-in plagiarism reports to maintain academic integrity.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Zap size={24} />
                </div>
                <h3 className="feature-title">Instant Feedback</h3>
                <p className="feature-desc">
                  Automated assignment feedback to accelerate learning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---- CTA Section ---- */}
        <section className="cta-section">
          <div className="section-content">
            <div className="cta-card">
              <h2 className="cta-title">Ready to Transform Your Classroom?</h2>
              <p className="cta-subtitle">
                Join thousands of educators and students already using AICo
              </p>
              <Link to="/login" className="btn btn-primary btn-lg">
                Login or Sign Up
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* ---- Footer ---- */}
        <footer className="landing-footer">
          <div className="footer-content">
            <div className="footer-logo">
              <div className="logo-icon">AI</div>
              <span>AI<span>Co</span></span>
            </div>
            <p className="footer-text">
              &copy; 2026 AICo — AI Classroom Dashboard. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

export default Landing;
