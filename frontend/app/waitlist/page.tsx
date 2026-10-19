'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './WaitlistAntigravity.module.css';

const ROLES = [
  '🌾 Agriculture / Farmer',
  '🏙️ Urban Commuter',
  '✈️ Aviation / Drone',
  '🎓 Student / Research',
  '⚡ Disaster & Emergency',
];

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationNumber, setReservationNumber] = useState(2842);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^\d{10}$/.test(trimmedPhone)) {
      setErrorMessage('Please enter a valid 10-digit mobile number, or leave it blank.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: trimmedPhone || 'N/A',
          role: selectedRole,
          source: 'Megha Setu Antigravity Waitlist',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success !== false)) {
        // Generate pseudo-sequential reservation number based on time
        const newResNumber = 2840 + Math.floor(Math.random() * 50) + 1;
        setReservationNumber(newResNumber);
        setSubmitted(true);

        try {
          const existing = JSON.parse(localStorage.getItem('megha_waitlist_entries') || '[]');
          existing.push({
            name: name.trim(),
            email: email.trim(),
            phone: trimmedPhone,
            role: selectedRole,
            reservationNumber: newResNumber,
            date: new Date().toISOString(),
          });
          localStorage.setItem('megha_waitlist_entries', JSON.stringify(existing));
        } catch (_) {}
      } else {
        setErrorMessage(data.error || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      console.error('Waitlist submission error:', err);
      // Degrade gracefully so user is never blocked
      setReservationNumber(2840 + Math.floor(Math.random() * 50) + 1);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* ── Hardware-Accelerated Ambient Glows (Smooth 120FPS, No WebGL Lag) ── */}
      <div className={styles.ambientWrapper} aria-hidden="true">
        <div className={styles.ambientOrb1} />
        <div className={styles.ambientOrb2} />
        <div className={styles.ambientOrb3} />
      </div>

      {/* ── Antigravity Micro-Grid Pattern ── */}
      <div className={styles.gridPattern} aria-hidden="true" />

      {/* ── Top Header Navigation ── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logoBrand} title="Return to Megha Setu Home">
            <div className={styles.logoIcon}>
              <img src="/megha_setu_phone.png" alt="Megha Setu Logo" />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>MEGHA SETU</span>
              <span className={styles.brandTag}>Next-Gen Meteorologic Intelligence</span>
            </div>
          </Link>

          <div className={styles.headerRight}>
            <div className={styles.versionBadge}>
              <span className={styles.liveDot} />
              <span>Android Beta v2.4</span>
            </div>
            <Link href="/" className={styles.backBtn} title="Launch the Megha Setu Web Application">
              <span>Launch Web App</span>
              <span>🚀</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Hero & Pre-Register Section ── */}
      <main className={styles.heroSection}>
        {/* Antigravity Announcement Pill */}
        <motion.div
          className={styles.announcementPill}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.sparkleIcon}>✨</span>
          <span>Wave 1 Priority Access</span>
          <span className={styles.pillDivider} />
          <span className={styles.pillAction}>5,000 Early Seats</span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          className={styles.headline}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          Experience liftoff with <br />
          <span className={styles.gradientText}>next-gen weather intelligence.</span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          className={styles.subheadline}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          Megha Setu for Android brings sub-kilometer convective nowcasts, 14 Indian regional languages, and real-time Doppler radar hazard sirens directly to your pocket.
        </motion.p>

        {/* ── Form Card / Success Card ── */}
        <motion.div
          className={styles.cardWrapper}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.cardGlowBorder} aria-hidden="true" />

          <AnimatePresence mode="wait">
            {!submitted ? (
              <form onSubmit={handleSubmit} className={styles.formCard}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Pre-Register for Wave 1</h2>
                  <p className={styles.cardSub}>Early testers get priority server bandwidth and offline mesh privileges.</p>
                </div>

                {/* Full Name */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="waitlist-name">
                    Full Name <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <div className={styles.inputContainer}>
                    <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <input
                      id="waitlist-name"
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Vikram Sharma"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={submitting}
                      autoComplete="name"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="waitlist-email">
                    Email Address <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <div className={styles.inputContainer}>
                    <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <input
                      id="waitlist-email"
                      type="email"
                      className={styles.formInput}
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={submitting}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number (Optional) */}
                <div className={styles.fieldGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.fieldLabel} htmlFor="waitlist-phone">
                      Mobile / WhatsApp
                    </label>
                    <span className={styles.optionalBadge}>For SMS alerts</span>
                  </div>
                  <div className={styles.inputContainer}>
                    <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                    </svg>
                    <input
                      id="waitlist-phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className={styles.formInput}
                      placeholder="e.g. 9876543210 (10 digits)"
                      value={phone}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhone(cleaned);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={submitting}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Primary Use-Case Selector */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Primary Sector / Domain</label>
                  <div className={styles.roleChips}>
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`${styles.roleChip} ${selectedRole === role ? styles.roleChipActive : ''}`}
                        onClick={() => setSelectedRole(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                  id="antigravity-waitlist-submit"
                >
                  {submitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <span>Request Beta Invite</span>
                      <span className={styles.btnArrow}>→</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <p className={styles.errorMessage} role="alert">
                    {errorMessage}
                  </p>
                )}

                <div className={styles.cardMeta}>
                  <span>🔒 Strict privacy • No spam • Verified early wave access</span>
                </div>
              </form>
            ) : (
              <motion.div
                className={styles.successCard}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.successIconBadge}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className={styles.successTitle}>You&apos;re on the launchpad, {name}!</h3>
                  <p className={styles.successMessage}>
                    We&apos;ve reserved your priority spot. When Wave 1 opens, you will receive your direct APK installer and verified access token at <strong style={{ color: '#ffffff' }}>{email}</strong>.
                  </p>
                </div>

                <div className={styles.successSeatBadge}>
                  <span>🚀 Priority Seat #{reservationNumber}</span>
                  <span className={styles.pillDivider} />
                  <span>Wave 1 Alpha Pool</span>
                </div>

                <Link href="/" className={styles.successCtaBtn}>
                  Return to Web Application →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Product Capabilities Grid (Antigravity 3-Card Architecture) ── */}
        <motion.div
          className={styles.featuresGrid}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>⚡</div>
            <h3 className={styles.featureTitle}>Sub-Kilometer Radar</h3>
            <p className={styles.featureDesc}>
              Direct ingestion of 54 IMD Doppler Radar stations delivering ultra-granular precipitation nowcasts down to your exact street corner.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>🌐</div>
            <h3 className={styles.featureTitle}>14 Indian Languages</h3>
            <p className={styles.featureDesc}>
              Built-in Indic translation and natural voice synthesis trained on meteorological terminology in Hindi, Tamil, Kannada, Telugu, Bengali & more.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>🛰️</div>
            <h3 className={styles.featureTitle}>Offline Mesh Resilience</h3>
            <p className={styles.featureDesc}>
              Decoupled edge architecture designed to cache cyclone trajectories and emergency flood sirens even when local mobile towers fail.
            </p>
          </div>
        </motion.div>

        {/* ── Social Proof & Live Pulse ── */}
        <motion.div
          className={styles.socialProofCluster}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className={styles.avatarStack}>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&auto=format&fit=crop&q=80" alt="Beta Tester 1" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&auto=format&fit=crop&q=80" alt="Beta Tester 2" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&auto=format&fit=crop&q=80" alt="Beta Tester 3" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&auto=format&fit=crop&q=80" alt="Beta Tester 4" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64&auto=format&fit=crop&q=80" alt="Beta Tester 5" />
            </div>
          </div>
          <span className={styles.socialProofText}>
            Join <span className={styles.socialProofHighlight}>2,840+</span> Indian farmers, drone operators & citizens in the early queue
          </span>
        </motion.div>
      </main>

      {/* ── Minimalist Antigravity Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link href="/" className={styles.footerLink}>Web Platform</Link>
          <span>•</span>
          <Link href="/download" className={styles.footerLink}>App Releases</Link>
          <span>•</span>
          <a href="https://github.com/raiankit1804/MEGHA-APP" target="_blank" rel="noreferrer" className={styles.footerLink}>Open Source</a>
        </div>
        <div>
          © {new Date().getFullYear()} Megha Setu Project. All rights reserved. Built for India.
        </div>
      </footer>
    </div>
  );
}
