'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Lightfall from '../../src/components/Lightfall';
import styles from './Waitlist6.module.css';

export default function WaitlistPage() {
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const trimmed = contact.trim();

    if (!trimmed) {
      setErrorMessage('Please enter your email or phone number.');
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhone = /^[+]?[\d\s-]{8,15}$/.test(trimmed);

    if (!isEmail && !isPhone) {
      setErrorMessage('Please enter a valid email address or phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: trimmed,
          email: isEmail ? trimmed : '',
          phone: isPhone ? trimmed : '',
          role: 'Private Beta Wave Three',
          source: 'React Bits Waitlist 6 + Lightfall',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        try {
          const existing = JSON.parse(localStorage.getItem('megha_waitlist_entries') || '[]');
          existing.push({ contact: trimmed, date: new Date().toISOString() });
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
      {/* Background: React Bits <Lightfall /> Component with White Light Streaks */}
      <div className={styles.lightfallBackground}>
        <Lightfall
          colors={['#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#FFFFFF', '#F8FAFC']}
          backgroundColor="#000000"
          speed={0.6}
          streakCount={5}
          streakWidth={1.2}
          streakLength={1.5}
          glow={1.15}
          density={0.75}
          twinkle={0.8}
          zoom={2.2}
          backgroundGlow={0.2}
          opacity={1}
          mouseInteraction={true}
          mouseStrength={0.7}
          mouseRadius={0.7}
        />
      </div>

      {/* Subtle Vignette Overlay */}
      <div className={styles.vignetteOverlay} />

      {/* Header Navigation */}
      <header className={styles.topNav}>
        <Link href="/" className={styles.backButton}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Return to Megha Setu</span>
        </Link>

        <div className={styles.brandLogo}>
          <div className={styles.logoIcon}>☁️</div>
          <span>Megha Setu</span>
        </div>
      </header>

      {/* Main Content Area matching the exact React Bits Waitlist 6 reference */}
      <div className={styles.mainContent}>
        {/* Category Pill: PRIVATE BETA · WAVE THREE */}
        <motion.div
          className={styles.categoryPill}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <span>PRIVATE BETA · WAVE THREE</span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          className={styles.headline}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          When we go live, you&apos;ll<br />feel it first.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subheadline}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          Megha Setu opens in small waves. Leave your email or phone number and you&apos;ll get a single ping the moment your invite unlocks: nothing else, ever.
        </motion.p>

        {/* The Glass Pill Input Form */}
        <motion.div
          className={styles.pillFormWrapper}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <form onSubmit={handleSubmit} className={styles.glassPill}>
                <input
                  type="text"
                  className={styles.pillInput}
                  placeholder="you@company.com"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={submitting}
                  autoComplete="email"
                  aria-label="Email or mobile number for invite"
                  required
                />

                <button
                  type="submit"
                  className={styles.pillButton}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Requesting...</span>
                  ) : (
                    <>
                      <span>Request invite</span>
                      <span className={styles.buttonArrow}>→</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <motion.div
                className={styles.successCard}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  You&apos;re in! We&apos;ll ping you the second Wave Three opens.
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMessage && (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          )}
        </motion.div>

        {/* Social Proof: Exact match with overlapping avatars + text */}
        <motion.div
          className={styles.socialProofCluster}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.75, delay: 0.35 }}
        >
          <div className={styles.avatarStack}>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80" alt="member 1" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80" alt="member 2" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80" alt="member 3" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80" alt="member 4" />
            </div>
            <div className={styles.avatar}>
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&auto=format&fit=crop&q=80" alt="member 5" />
            </div>
          </div>
          <span className={styles.socialProofText}>
            <strong>11,204</strong> already in the queue · next wave this month
          </span>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>© 2026 Megha Setu — Synoptic Offline Meteorological Network</span>
        <div className={styles.footerLinks}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/#keynote" className={styles.footerLink}>Android Keynote</Link>
          <a href="https://reactbits.dev" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>React Bits</a>
        </div>
      </footer>
    </main>
  );
}
