import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { submitContactQuery } from '../api/contact.api';
import '../style/contact.css';

interface ContactUsProps {
  onClose: () => void;
}

export function ContactUs({ onClose }: ContactUsProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitContactQuery(formData);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Failed to submit query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="vf-contact-backdrop" onClick={onClose}>
      <section className="vf-contact-page" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="vf-contact-close-btn" onClick={onClose} aria-label="Close contact form">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* LEFT SIDE */}
        <div className="vf-contact-left">
          {/* BRAND */}
          <div className="vf-contact-brand" onClick={onClose} style={{ cursor: 'pointer' }}>
            <h2>VideoForge</h2>
          </div>

          {/* TEXT */}
          <div className="vf-contact-copy">
            <p>
              Enterprise-grade video transcoding infrastructure
              built for transcoding, AI subtitles,
              adaptive streaming, compression,
              and global delivery.
            </p>

            <div className="vf-contact-meta">
              <div>
                <span>✦</span>
                support@videoforge.example
              </div>
              <div>
                <span>✦</span>
                +1 000 000 0000
              </div>
            </div>
          </div>

          {/* 3D REVOLVING SECTION */}
          <div className="vf-revolve-wrapper">
            <div className="vf-revolve">
              {/* CARD 1 */}
              <div className="vf-card" style={{ ['--i' as any]: 0 }}>
                <div className="vf-card-glow orange-glow"></div>
                <div className="vf-card-content">
                  <div className="vf-icon orange-icon">⚡</div>
                  <h3>24/7 Support</h3>
                  <p>
                    Dedicated infrastructure support with real-time monitoring.
                  </p>
                </div>
              </div>

              {/* CARD 2 */}
              <div className="vf-card" style={{ ['--i' as any]: 1 }}>
                <div className="vf-card-glow green"></div>
                <div className="vf-card-content">
                  <div className="vf-icon green-icon">✦</div>
                  <h3>Feedback Loop</h3>
                  <p>
                    Product improvements driven by enterprise developers.
                  </p>
                </div>
              </div>

              {/* CARD 3 */}
              <div className="vf-card" style={{ ['--i' as any]: 2 }}>
                <div className="vf-card-glow purple"></div>
                <div className="vf-card-content">
                  <div className="vf-icon purple-icon">◉</div>
                  <h3>Media Inquiries</h3>
                  <p>
                    Contact our partnerships and media collaboration team.
                  </p>
                </div>
              </div>

              {/* CARD 4 */}
              <div className="vf-card" style={{ ['--i' as any]: 3 }}>
                <div className="vf-card-glow cyan"></div>
                <div className="vf-card-content">
                  <div className="vf-icon cyan-icon">
                    <Zap size={18} fill="currentColor" />
                  </div>
                  <h3>Complete Platform</h3>
                  <p>
                    Streaming, subtitles, transcoding, AI processing, CDN delivery, and analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="vf-contact-right">
          {success ? (
            <div className="vf-contact-success animate-slide-up">
              <div className="success-icon-wrapper">
                <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                  <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                  <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <h2>Thank you, {formData.firstName}!</h2>
              <p>Your message has been safely sent to our administrator (<strong>support@videoforge.example</strong>).</p>
              <p className="success-sub">We will review your inquiry and reply to <strong>{formData.email}</strong> shortly.</p>
              <button className="success-close-btn" onClick={onClose}>Done</button>
            </div>
          ) : (
            <form className="vf-contact-form" onSubmit={handleSubmit}>
              <h2 className="form-breathe-heading">Contact Us</h2>
              <p>You can reach us anytime</p>

              {error && <div className="vf-error-message">{error}</div>}

              <div className="vf-row">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={submitting}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={submitting}
                />
              </div>

              <input
                type="email"
                name="email"
                placeholder="Your email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={submitting}
              />

              <div className="vf-row">
                <select
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleInputChange}
                  disabled={submitting}
                  style={{ width: '35%' }}
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+49">+49 (DE)</option>
                  <option value="+61">+61 (AU)</option>
                </select>
                <input
                  type="text"
                  name="phone"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  disabled={submitting}
                />
              </div>

              <textarea
                name="message"
                placeholder="How can we help?"
                value={formData.message}
                onChange={handleInputChange}
                required
                disabled={submitting}
              ></textarea>

              <button type="submit" disabled={submitting}>
                {submitting ? (
                  <span className="vf-loading-dots">
                    Submitting
                    <span className="vf-loading-dot"></span>
                    <span className="vf-loading-dot"></span>
                    <span className="vf-loading-dot"></span>
                  </span>
                ) : (
                  'Submit →'
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
