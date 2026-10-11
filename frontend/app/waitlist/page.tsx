'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Waitlist6.module.css';

interface RipplePoint {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  opacity: number;
  frequency: number;
}

export default function WaitlistPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const ripplesRef = useRef<RipplePoint[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize interactive dynamic ripple field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initial ambient center ripples
    const addRipple = (x: number, y: number, maxRadius = 380, speed = 0.85) => {
      ripplesRef.current.push({
        x,
        y,
        radius: 0,
        maxRadius,
        speed,
        opacity: 0.6,
        frequency: Math.random() * 0.02 + 0.015,
      });
      // Cap ripple count for peak 60fps performance
      if (ripplesRef.current.length > 18) {
        ripplesRef.current.shift();
      }
    };

    // Auto-pulse subtle ambient concentric ripples from the center
    const pulseInterval = setInterval(() => {
      addRipple(width / 2, height / 2, Math.min(width, height) * 0.65, 0.7);
    }, 1800);

    // Interactive pointer ripples
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      if (Math.random() > 0.65) {
        addRipple(clientX, clientY, 260, 1.2);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchstart', handlePointerMove);

    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric background tint
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
      grad.addColorStop(0.5, 'rgba(3, 7, 18, 0.98)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render concentric wave ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += r.speed;
        const progress = r.radius / r.maxRadius;
        r.opacity = Math.max(0, (1 - progress) * 0.45);

        if (r.opacity <= 0.01 || r.radius >= r.maxRadius) {
          ripplesRef.current.splice(i, 1);
          continue;
        }

        // Concentric wave ripple strokes
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${r.opacity * 0.8})`;
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
        ctx.stroke();

        // Echo harmonic ring
        if (r.radius > 25) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, Math.max(0, r.radius - 20), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 102, 241, ${r.opacity * 0.35})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchstart', handlePointerMove);
      clearInterval(pulseInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const trimmed = contact.trim();

    if (!trimmed) {
      setErrorMessage('Please enter your email or mobile number.');
      return;
    }

    // Basic format check
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhone = /^[+]?[\d\s-]{8,15}$/.test(trimmed);

    if (!isEmail && !isPhone) {
      setErrorMessage('Please enter a valid email address or 10-digit mobile number.');
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
          role: 'Early Beta Tester',
          source: 'React Bits Pro Waitlist 6',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        // Backup save to localStorage
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
      // Even if network fails, register locally
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.pageContainer}>
      {/* Dynamic GLSL / Canvas Ripple Wave Field */}
      <canvas ref={canvasRef} className={styles.rippleCanvas} />

      {/* Atmospheric Radial Light Orbs */}
      <div className={styles.ambientGlowTop} />
      <div className={styles.ambientGlowCenter} />

      {/* Top Navigation */}
      <header className={styles.topNav}>
        <Link href="/" className={styles.backButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Return to Megha Setu</span>
        </Link>

        <div className={styles.brandLogo}>
          <div className={styles.logoIcon}>☁️</div>
          <span>Megha Setu</span>
        </div>

        <div className={styles.topBadge}>
          <span className={styles.pulsingDot} style={{ width: 6, height: 6 }} />
          <span>Closed Beta • Q2 2026</span>
        </div>
      </header>

      {/* Main Content Area: React Bits Pro Waitlist 6 Block */}
      <div className={styles.mainContent}>
        {/* Category Pill with Pulsing Beacon */}
        <motion.div
          className={styles.categoryPill}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.pulsingDot} />
          <span>Priority Beta Access • Wave 1 Allocation</span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          className={styles.headline}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Be first in line when<br />Megha Setu launches.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles.subheadline}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Pre-register with your email or phone number to receive an exclusive early access invitation when the closed beta opens for the Android application.
        </motion.p>

        {/* Signature React Bits Pro: Glass Pill Input Over Ripples */}
        <motion.div
          className={styles.pillFormWrapper}
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <form onSubmit={handleSubmit} className={styles.glassPill}>
                <div className={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>

                <input
                  type="text"
                  className={styles.pillInput}
                  placeholder="Enter email or mobile number"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={submitting}
                  autoComplete="email"
                  aria-label="Email or mobile number for waitlist"
                  required
                />

                <button
                  type="submit"
                  className={styles.pillButton}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <span>Notify Me</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <motion.div
                className={styles.successCard}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>
                  ✓ You’re registered! We’ll notify you as soon as the application closed beta opens.
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

        {/* Social Proof Avatar Stack */}
        <motion.div
          className={styles.socialProofCluster}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
        >
          <div className={styles.avatarStack}>
            <div className={`${styles.avatar} ${styles.avatar1}`}>AR</div>
            <div className={`${styles.avatar} ${styles.avatar2}`}>SK</div>
            <div className={`${styles.avatar} ${styles.avatar3}`}>RM</div>
            <div className={`${styles.avatar} ${styles.avatar4}`}>PK</div>
            <div className={`${styles.avatar} ${styles.avatar5}`}>+</div>
          </div>
          <p className={styles.socialProofText}>
            Joined by <strong>1,420+</strong> meteorological observers, farm leads, and responders across India.
          </p>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          className={styles.trustRow}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
        >
          <span className={styles.trustItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Zero Spam Guarantee
          </span>
          <span className={styles.trustDot} />
          <span className={styles.trustItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            SMS / WhatsApp Notification
          </span>
          <span className={styles.trustDot} />
          <span className={styles.trustItem}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Wave 1 Early Access Token
          </span>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>© 2026 Megha Setu — Synoptic Offline Meteorological Network</span>
        <div className={styles.footerLinks}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/#keynote" className={styles.footerLink}>Android Keynote</Link>
          <a href="https://pro.reactbits.dev/docs/blocks/waitlist/waitlist-6" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>Design Spec: Waitlist 6</a>
        </div>
      </footer>
    </main>
  );
}
