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
      setErrorMessage('Please enter your name.');
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
      {/* Background: React Bits <Lightfall /> Component with White Light Streaks */}
      <div className={styles.lightfallBackground}>
        <Lightfall
          colors={['#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#FFFFFF', '#F8FAFC']}
          backgroundColor="#000000"
          speed={0.65}
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

      {/* Centered Main Content (Locked in Viewport, Zero Background Patch) */}
      <div className={styles.mainContent}>
        {/* Hero Headline: Balanced 2-line structure */}
        <motion.h1
          className={styles.headline}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          When we go live, you&apos;ll<br />feel it first.
        </motion.h1>

        {/* Subtitle with High Contrast & Legibility */}
        <motion.p
          className={styles.subheadline}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Megha Setu opens in small waves. Leave your email or phone number and you&apos;ll get a single ping the moment your invite unlocks: nothing else, ever.
        </motion.p>

        {/* Unified Seamless Glass Capsule Form */}
        <motion.div
          className={styles.formCardWrapper}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <form onSubmit={handleSubmit} className={styles.unifiedGlassCapsule}>
                <div className={styles.capsuleInputRow}>
                  <input
                    type="text"
                    className={styles.capsuleInput}
                    placeholder="Your name"
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

                <div className={styles.capsuleDivider} />

                <div className={styles.capsuleInputRow}>
                  <input
                    type="email"
                    className={styles.capsuleInput}
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

                <div className={styles.capsuleDivider} />

                <div className={styles.capsuleInputRow}>
                  <input
                    type="tel"
                    className={styles.capsuleInput}
                    placeholder="Mobile number (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                    autoComplete="tel"
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
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
                transition={{ duration: 0.3 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  You&apos;re registered, {name}! We&apos;ll notify you the moment your invite unlocks.
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

        {/* Social Proof: Avatars + "people are waiting for the next wave" */}
        <motion.div
          className={styles.socialProofCluster}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
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
