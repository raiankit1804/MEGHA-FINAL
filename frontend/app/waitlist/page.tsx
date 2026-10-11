'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Lightfall from '../../src/components/Lightfall';
import styles from './Waitlist6.module.css';

export default function WaitlistPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: 'Early Beta Tester',
          source: 'Megha Setu Waitlist',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        try {
          const existing = JSON.parse(localStorage.getItem('megha_waitlist_entries') || '[]');
          existing.push({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            date: new Date().toISOString(),
          });
          localStorage.setItem('megha_waitlist_entries', JSON.stringify(existing));
        } catch (_) {}
      } else {
        setErrorMessage(data.error || 'Failed to submit. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.pageContainer}>
      {/* Background: Highly-Optimized Smooth 60FPS Lightfall */}
      <div className={styles.lightfallBackground}>
        <Lightfall
          colors={['#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#FFFFFF']}
          backgroundColor="#000000"
          speed={0.45}
          streakCount={3}
          streakWidth={1.0}
          streakLength={1.2}
          glow={1.1}
          density={0.65}
          twinkle={0.7}
          zoom={2.2}
          backgroundGlow={0.18}
          opacity={1}
          dpr={1}
          mouseInteraction={false}
        />
      </div>

      {/* Dark Vignette Overlay for Crisp Legibility */}
      <div className={styles.vignetteOverlay} />

      {/* Floating Top-Left Back Navigation */}
      <Link href="/" className={styles.floatingBack} title="Return to Megha Setu">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back</span>
      </Link>

      {/* Centered Main Content (Locked in Viewport) */}
      <div className={styles.mainContent}>
        {/* Hero Headline */}
        <motion.h1
          className={styles.headline}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          When we go live, you&apos;ll<br />feel it first.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subheadline}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          Megha Setu opens in small waves. Leave your details below and you&apos;ll get a single ping the moment your invite unlocks: nothing else, ever.
        </motion.p>

        {/* Real Structured Form Card */}
        <motion.div
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <form onSubmit={handleSubmit} className={styles.formCard}>
                {/* Full Name Field */}
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
                      placeholder="Enter your full name"
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

                {/* Email Address Field */}
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
                      placeholder="you@company.com"
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

                {/* Mobile Number Field (Optional) */}
                <div className={styles.fieldGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.fieldLabel} htmlFor="waitlist-phone">
                      Mobile Number
                    </label>
                    <span className={styles.optionalBadge}>Optional</span>
                  </div>
                  <div className={styles.inputContainer}>
                    <svg className={styles.fieldIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                      <path d="M12 18h.01" />
                    </svg>
                    <input
                      id="waitlist-phone"
                      type="tel"
                      className={styles.formInput}
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submitting}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Requesting...</span>
                  ) : (
                    <>
                      <span>Request Invite</span>
                      <span className={styles.btnArrow}>→</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <p className={styles.errorMessage} role="alert">
                    {errorMessage}
                  </p>
                )}
              </form>
            ) : (
              <motion.div
                className={styles.successCard}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.successIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.1rem', fontWeight: 600 }}>You&apos;re registered, {name}!</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                    We&apos;ve reserved your priority spot. We&apos;ll notify you the moment your invite unlocks.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Social Proof: Avatars + "people are waiting for the next wave" */}
        <motion.div
          className={styles.socialProofCluster}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={styles.avatarStack}>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="member 1" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80" alt="member 2" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80" alt="member 3" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=50&auto=format&fit=crop&q=80" alt="member 4" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&auto=format&fit=crop&q=80" alt="member 5" />
            </div>
          </div>
          <span className={styles.socialProofText}>
            people are waiting for the next wave
          </span>
        </motion.div>
      </div>
    </main>
  );
}
