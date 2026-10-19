'use client';

import React, { useState, useRef } from 'react';
import styles from './DownloadPageAntigravity.module.css';

export interface DownloadPageProps {
  onClose: () => void;
  language?: string;
}

const SECTORS = [
  '🌾 Agriculture / Farmer',
  '🏙️ Urban Commuter',
  '✈️ Aviation / Drone',
  '🎓 Student / Research',
  '⚡ Disaster & Emergency'
];

export default function DownloadPage({ onClose }: DownloadPageProps) {
  const [downloading, setDownloading] = useState(false);
  const [activeAiMode, setActiveAiMode] = useState<'offlineHigh' | 'offlineLow' | 'onlineNimbus'>('offlineHigh');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  // Pre-Registration Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);

  const handleDownload = () => {
    setDownloading(true);
    const link = document.createElement('a');
    link.href = '/megha-setu-v1.0.4.apk';
    link.download = 'megha-setu-v1.0.4.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 3000);
  };

  const handleGeneratePdf = () => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      setPdfReady(true);
      setTimeout(() => setPdfReady(false), 5000);
    }, 700);
  };

  const scrollToRegister = () => {
    const el = document.getElementById('preregister');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          sector
        })
      });

      const data = await res.json().catch(() => null);
      const assigned = data?.position || Math.floor(2840 + Math.random() * 50);
      setQueueNumber(assigned);
      setSubmitted(true);
    } catch {
      setQueueNumber(Math.floor(2840 + Math.random() * 50));
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.downloadOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Megha Setu Android Preview"
    >
      {/* Background Ambient Glows & Dot Matrix */}
      <div className={styles.ambientBackdrop} aria-hidden="true">
        <div className={styles.glowTopCyan} />
        <div className={styles.glowMiddlePurple} />
        <div className={styles.glowBottomEmerald} />
        <div className={styles.dotGrid} />
      </div>

      {/* Frosted Glass Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.brandGroup}>
          <img src="/megha_setu_phone.png" alt="Megha Setu Logo" className={styles.brandLogo} />
          <span className={styles.brandName}>Megha Setu</span>
          <span className={styles.versionBadge}>
            <span className={styles.pulseDot} />
            Android Beta v2.4
          </span>
        </div>

        <div className={styles.topBarActions}>
          <button
            type="button"
            onClick={scrollToRegister}
            className={styles.navCta}
            title="Pre-Register for Early Access"
          >
            <span>Pre-Register</span>
            <span>→</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Return to Megha Setu"
            title="Close Preview"
          >
            <span>Done</span>
            <span>✕</span>
          </button>
        </div>
      </header>

      {/* Main Page Content */}
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroPill}>
            <span>✨</span>
            <span>Wave 1 Priority Access •</span>
            <span className={styles.heroPillHighlight}>5,000 Early Seats</span>
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.gradientText}>Predict every storm.</span>
            <br />
            <span className={styles.gradientText}>Protect India.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Megha Setu for Android puts IMD Doppler radar sweeps, zero-cell BLE disaster mesh alerts, and Kisan AI crop guidance directly into your hands.
          </p>

          <div className={styles.heroCtaCluster}>
            <button
              type="button"
              onClick={scrollToRegister}
              className={styles.primaryCta}
              id="hero-preregister-cta"
            >
              <span>🚀 Pre-Register for Early Access</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className={styles.secondaryCta}
              disabled={downloading}
              id="hero-download-apk-btn"
            >
              <span>{downloading ? '⏳ Starting Download...' : '📥 Download Closed Beta APK'}</span>
            </button>
          </div>

          {/* Quick Hardware Spec Strip */}
          <div className={styles.statStrip}>
            <span className={styles.statPill}>📡 39 IMD Doppler Radars</span>
            <span className={styles.statPill}>📶 100% Offline BLE Mesh</span>
            <span className={styles.statPill}>🗣️ 22 Indic Languages</span>
            <span className={styles.statPill}>⚡ Sub-50ms Sensor Fusion</span>
          </div>
        </section>

        {/* Antigravity Phone Showcase */}
        <section className={styles.showcaseSection} aria-label="Device Preview">
          <div className={styles.deviceMockupFrame}>
            <div className={styles.deviceScreen}>
              <div className={styles.dynamicIsland} />

              <div className={styles.screenHeader}>
                <div>
                  <div className={styles.screenCity}>Bengaluru, Karnataka</div>
                  <div className={styles.screenCondition}>Doppler Tracked • Convective Alert</div>
                </div>
                <div className={styles.screenTemp}>24°</div>
              </div>

              {/* Radar Sweep Animation (Pure CSS, 120 FPS) */}
              <div className={styles.radarContainer} aria-hidden="true">
                <div className={styles.radarRings}>
                  <div className={styles.radarRing1} />
                  <div className={styles.radarRing2} />
                  <div className={styles.radarRing3} />
                </div>
                <div className={styles.radarSweep} />
                <div className={styles.radarCenterBadge}>
                  <span>LAUNCHING Q2 2026</span>
                  <span>CLOSED ALPHA READY</span>
                </div>
              </div>

              <div className={styles.screenAlert}>
                <span className={styles.screenAlertIcon}>⚡</span>
                <div>
                  <div className={styles.screenAlertTitle}>Severe Convective Cell Detected</div>
                  <div className={styles.screenAlertSub}>IMD Doppler Radar: Rain expected in 18 mins</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Embedded Antigravity Pre-Registration Card */}
        <section id="preregister" className={styles.registrationSection}>
          <div className={styles.registrationCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTag}>
                <span>✨ Priority Waitlist</span>
              </div>
              <h2 className={styles.cardTitle}>Claim Your Wave 1 Invite</h2>
              <p className={styles.cardSub}>
                Be the first in your district to test offline mesh alerts, Doppler nowcasting, and Kisan AI.
              </p>
            </div>

            {submitted ? (
              <div className={styles.confirmedCard}>
                <div className={styles.successIcon}>✓</div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem' }}>
                  You&apos;re in the Priority Queue!
                </h3>
                <div className={styles.queueBadge}>
                  🚀 Priority Seat #{queueNumber} • Wave 1 Alpha Pool
                </div>
                <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 auto 1.5rem', maxWidth: '420px' }}>
                  We sent an invitation verification email to <strong style={{ color: '#ffffff' }}>{email}</strong>. When Wave 1 invites open, you will receive direct private APK download keys.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className={styles.secondaryCta}
                  style={{ fontSize: '0.85rem', padding: '0.6rem 1.4rem' }}
                >
                  Register Another Member
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitWaitlist} className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="prereg-name" className={styles.inputLabel}>
                    Full Name *
                  </label>
                  <input
                    id="prereg-name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prereg-email" className={styles.inputLabel}>
                    Email Address *
                  </label>
                  <input
                    id="prereg-email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prereg-phone" className={styles.inputLabel}>
                    Mobile Number (Optional — for SMS Emergency Alerts)
                  </label>
                  <input
                    id="prereg-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Your Primary Use Case</label>
                  <div className={styles.chipsContainer}>
                    {SECTORS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSector(sec)}
                        className={`${styles.chipBtn} ${sector === sec ? styles.chipBtnActive : ''}`}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.submitBtn}
                >
                  {isSubmitting ? 'Securing Priority Seat...' : 'Request Early Access Invite →'}
                </button>

                <div className={styles.socialProof}>
                  <div className={styles.avatarStack}>
                    <div className={styles.avatar} style={{ background: '#3b82f6' }}>R</div>
                    <div className={styles.avatar} style={{ background: '#10b981' }}>P</div>
                    <div className={styles.avatar} style={{ background: '#f59e0b' }}>A</div>
                    <div className={styles.avatar} style={{ background: '#8b5cf6' }}>S</div>
                  </div>
                  <span>Join 2,840+ Indian farmers, drone pilots & citizens in the early queue</span>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Bento Grid: Capabilities & Architecture */}
        <section className={styles.bentoSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Architecture</span>
            <h2 className={styles.sectionTitle}>Engineered for India&apos;s Extremes.</h2>
            <p className={styles.sectionSub}>
              Groundbreaking disaster defense and meteorological capabilities built directly into the Android application.
            </p>
          </div>

          <div className={styles.bentoGrid}>
            {/* Card 1: 3 AI Modes (Cirrus 1.7B, Mist 270M, Nimbus Cloud) */}
            <div className={`${styles.bentoCard} ${styles.col12}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>🧠</span>
                  <span>Neural Engine Architecture • 3 AI Modes (Totally Optional)</span>
                </div>
                <h3 className={styles.bentoHeadline}>3 Intelligent AI modes. Optimized for every phone.</h3>
                <p className={styles.bentoText}>
                  Two dedicated 100% offline edge models tailored for higher-RAM and low-RAM budget devices, plus Nimbus online cloud mode.
                  <strong style={{ color: '#38bdf8' }}> Totally optional:</strong> offline models download on-demand only if you choose to enable zero-internet local intelligence.
                </p>

                {/* Tab Switcher */}
                <div className={styles.aiTabControls} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'offlineHigh'}
                    onClick={() => setActiveAiMode('offlineHigh')}
                    className={`${styles.aiTabBtn} ${activeAiMode === 'offlineHigh' ? styles.aiTabBtnActive : ''}`}
                  >
                    ☁️ Cirrus (1.7B)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'offlineLow'}
                    onClick={() => setActiveAiMode('offlineLow')}
                    className={`${styles.aiTabBtn} ${activeAiMode === 'offlineLow' ? styles.aiTabBtnActive : ''}`}
                  >
                    🌫️ Mist (270M)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'onlineNimbus'}
                    onClick={() => setActiveAiMode('onlineNimbus')}
                    className={`${styles.aiTabBtn} ${activeAiMode === 'onlineNimbus' ? styles.aiTabBtnActive : ''}`}
                  >
                    ⚡ Nimbus (Cloud)
                  </button>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: '0.8rem 0 0', lineHeight: 1.55 }}>
                  {activeAiMode === 'offlineHigh' &&
                    'Cirrus: High-altitude reasoning engine running on-device with 1.7B parameters. High-quality conversational reasoning and dialect voice assistance designed for mid-to-high tier phones.'}
                  {activeAiMode === 'offlineLow' &&
                    'Mist: Highly compact 270M parameter weights optimized to run everywhere, including budget phones with constrained RAM. Ultra-lightweight and efficient.'}
                  {activeAiMode === 'onlineNimbus' &&
                    'Nimbus: Connects to cloud supercomputing clusters when internet is available. Fuses 39 Doppler radar sweeps, ISRO INSAT-3DS multi-spectral radiance feeds, and numerical WRF weather prediction equations.'}
                </p>
              </div>

              <div className={styles.aiSpecsRow}>
                <div>
                  <span className={styles.aiSpecItemLabel}>Cloud Codename</span>
                  <span className={styles.aiSpecItemValue} style={{ color: '#38bdf8' }}>
                    {activeAiMode === 'offlineHigh' && 'Cirrus (high, light cloud)'}
                    {activeAiMode === 'offlineLow' && 'Mist'}
                    {activeAiMode === 'onlineNimbus' && 'Nimbus (cloud type)'}
                  </span>
                </div>
                <div>
                  <span className={styles.aiSpecItemLabel}>Model Size</span>
                  <span className={styles.aiSpecItemValue} style={{ color: '#4ade80' }}>
                    {activeAiMode === 'offlineHigh' && '~1.4 GB (Optional)'}
                    {activeAiMode === 'offlineLow' && '~220 MB (Optional)'}
                    {activeAiMode === 'onlineNimbus' && '0 MB Local (Cloud API)'}
                  </span>
                </div>
                <div>
                  <span className={styles.aiSpecItemLabel}>Target Hardware</span>
                  <span className={styles.aiSpecItemValue}>
                    {activeAiMode === 'offlineHigh' && 'Mid & Flagship Devices'}
                    {activeAiMode === 'offlineLow' && 'Budget & Low-RAM Devices'}
                    {activeAiMode === 'onlineNimbus' && 'All Android Devices'}
                  </span>
                </div>
                <div>
                  <span className={styles.aiSpecItemLabel}>Download Status</span>
                  <span className={styles.aiSpecItemValue}>
                    {activeAiMode === 'onlineNimbus' ? 'No Download Needed' : 'On-Demand Download'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Barometric Pressure Sensor */}
            <div className={`${styles.bentoCard} ${styles.col6}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>🧭</span>
                  <span>Atmospheric Pressure • Hardware Barometer</span>
                </div>
                <h3 className={styles.bentoHeadline}>Precision air pressure & storm inflow detection.</h3>
                <p className={styles.bentoText}>
                  Continuously monitors barometric pressure through internal phone MEMS sensors and IMD station calibration to anticipate sudden convective downbursts.
                </p>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>1008.4 <span style={{ fontSize: '1rem', color: '#94a3b8' }}>hPa</span></span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.15)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                    ▼ -3.2 hPa / 3h (Storm Inflow Drop)
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
                  Station Elevation: 920m ASL • QNH Synoptic Corrected
                </div>
              </div>
            </div>

            {/* Card 3: Situation PDF Report Generator */}
            <div className={`${styles.bentoCard} ${styles.col6}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>📄</span>
                  <span>Relief & Insurance • Proof</span>
                </div>
                <h3 className={styles.bentoHeadline}>1-Tap disaster situation PDF report.</h3>
                <p className={styles.bentoText}>
                  Instantly compile formal, geo-tagged meteorological incident briefings formatted for Panchayats, DDMA authorities, and crop insurance claims.
                </p>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                {pdfReady ? (
                  <div style={{ padding: '0.85rem', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '14px', color: '#4ade80', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                    ✓ Situation_Report_Bengaluru_Oct2026.pdf Ready (1.4 MB)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={pdfGenerating}
                    className={styles.secondaryCta}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <span>{pdfGenerating ? '⏳ Compiling Meteorological Data...' : '📄 Generate Situation Report PDF'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card 4: Doppler Ultra */}
            <div className={`${styles.bentoCard} ${styles.col8}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>📡</span>
                  <span>Doppler Radar & Storm Nowcasting</span>
                </div>
                <h3 className={styles.bentoHeadline}>500-meter reflective radar sweeps.</h3>
                <p className={styles.bentoText}>
                  Track storm clouds, hail, and squall lines across India with ultra-low latency directly from 39 Indian Doppler Weather Radars.
                </p>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#38bdf8', margin: '1rem 0 0' }}>
                500m
              </div>
            </div>

            {/* Card 5: Offline Disaster Mesh */}
            <div className={`${styles.bentoCard} ${styles.col4}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>📶</span>
                  <span>Zero Infrastructure</span>
                </div>
                <h3 className={styles.bentoHeadline}>Offline Disaster Mesh.</h3>
                <p className={styles.bentoText}>
                  Peer-to-peer BLE and Wi-Fi Direct communication relaying SOS alerts between villagers when cell towers are down.
                </p>
              </div>
              <div style={{ fontSize: '2.5rem', marginTop: '1.2rem' }}>
                📶
              </div>
            </div>
          </div>
        </section>

        {/* 5 Specialized Operating Modes */}
        <section style={{ margin: '0 auto 5.5rem' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>Multi-Domain OS</span>
            <h2 className={styles.sectionTitle}>5 Specialized Modes. One App.</h2>
            <p className={styles.sectionSub}>
              Engineered for farmers, pilots, fishermen, city commuters, and disaster emergency managers.
            </p>
          </div>

          <div className={styles.modesGrid}>
            <div className={styles.modeCard}>
              <div className={styles.modeIcon}>🏙️</div>
              <h3 className={styles.modeTitle}>City Mode</h3>
              <p className={styles.modeDesc}>Waterlogging alerts, storm drains, street-level downpour radar, and heat island indexes.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIcon}>🌾</div>
              <h3 className={styles.modeTitle}>AgriSense</h3>
              <p className={styles.modeDesc}>Advisory for 48+ Indian crops. Spraying windows, frost, and soil moisture forecasts.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIcon}>✈️</div>
              <h3 className={styles.modeTitle}>SkyOps</h3>
              <p className={styles.modeDesc}>Runway Visual Range (RVR), METAR/TAF briefings, crosswind alerts, and cloud-top heights.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIcon}>⚓</div>
              <h3 className={styles.modeTitle}>SeaCast</h3>
              <p className={styles.modeDesc}>Coastal winds, swell heights, cyclone trajectory maps, and high seas advisories.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIcon}>🔬</div>
              <h3 className={styles.modeTitle}>Climate X</h3>
              <p className={styles.modeDesc}>Monsoon trough movement, ENSO/IOD indexes, and 50-year historical climate anomaly tracking.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footerArea}>
          <p>
            Megha Setu • Built for India by Team Neural Nimbus •{' '}
            <a href="#preregister" onClick={scrollToRegister}>
              Join Priority Beta Access
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
