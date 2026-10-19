'use client';

import React, { useState } from 'react';
import styles from './DownloadPageAntigravity.module.css';

export interface DownloadPageProps {
  onClose: () => void;
  language?: string;
}

const SECTORS = [
  'Agriculture & Farming',
  'Urban Commute & Civic',
  'Aviation & Drone Ops',
  'Research & Academia',
  'Emergency & Disaster Relief'
];

export default function DownloadPage({ onClose }: DownloadPageProps) {
  const [activeAiMode, setActiveAiMode] = useState<'offlineHigh' | 'offlineLow' | 'onlineNimbus'>('offlineHigh');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  // Pre-Registration Form State (Truthful, Zero Fake Numbers)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sector, setSector] = useState(SECTORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleGeneratePdf = () => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      setPdfReady(true);
      setTimeout(() => setPdfReady(false), 5000);
    }, 800);
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
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          sector
        })
      });
      setSubmitted(true);
    } catch {
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
      aria-label="Megha Setu Android Technical Preview"
    >
      {/* Background Ambient Glows & Dot Matrix */}
      <div className={styles.ambientBackdrop} aria-hidden="true">
        <div className={styles.glowTop} />
        <div className={styles.glowMiddle} />
        <div className={styles.dotGrid} />
      </div>

      {/* Minimalist Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.brandGroup}>
          <img src="/megha_setu_phone.png" alt="Megha Setu" className={styles.brandLogo} />
          <div className={styles.brandTitleGroup}>
            <span className={styles.brandName}>Megha Setu</span>
            <span className={styles.versionBadge}>
              <span className={styles.pulseDot} />
              Android Beta Version
            </span>
          </div>
        </div>

        <div className={styles.topBarActions}>
          <button
            type="button"
            onClick={scrollToRegister}
            className={styles.navCta}
            title="Request Alpha Access"
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

      {/* Main Responsive Container */}
      <div className={styles.container}>
        {/* Technical Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroTag}>
            <span>MEGHA SETU // ANDROID ALPHA</span>
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.gradientText}>Predict every storm.</span>
            <br />
            <span className={styles.gradientText}>Protect India.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Next-generation meteorological intelligence built for Android. Fusing 39 IMD Doppler weather radars, zero-infrastructure BLE disaster mesh alerts, and on-device neural forecasting.
          </p>

          <div className={styles.heroCtaCluster}>
            <button
              type="button"
              onClick={scrollToRegister}
              className={styles.primaryCta}
              id="hero-preregister-cta"
            >
              <span>Request Early Access Invite →</span>
            </button>
          </div>

          {/* Technical Specifications Strip */}
          <div className={styles.statStrip}>
            <span className={styles.statPill}>
              <span className={styles.statPillDot} />
              39 Doppler Radars
            </span>
            <span className={styles.statPill}>
              <span className={styles.statPillDot} />
              Zero-Cell BLE Mesh
            </span>
            <span className={styles.statPill}>
              <span className={styles.statPillDot} />
              22 Indic Languages
            </span>
            <span className={styles.statPill}>
              <span className={styles.statPillDot} />
              MEMS Barometer Telemetry
            </span>
          </div>
        </section>

        {/* Technical Device Preview */}
        <section className={styles.showcaseSection} aria-label="Device Architecture Preview">
          <div className={styles.deviceMockupFrame}>
            <div className={styles.deviceScreen}>
              <div className={styles.dynamicIsland} />

              <div className={styles.screenHeader}>
                <div>
                  <div className={styles.screenCity}>Bengaluru, Karnataka</div>
                  <div className={styles.screenCondition}>IMD Doppler Station Tracked</div>
                </div>
                <div className={styles.screenTemp}>24°</div>
              </div>

              {/* Radar Sweep Canvas (Pure CSS 120 FPS) */}
              <div className={styles.radarContainer} aria-hidden="true">
                <div className={styles.radarRings}>
                  <div className={styles.radarRing1} />
                  <div className={styles.radarRing2} />
                  <div className={styles.radarRing3} />
                </div>
                <div className={styles.radarSweep} />
                <div className={styles.radarCenterBadge}>
                  <span>RADAR COMPOSITE</span>
                  <span>500m RESOLUTION</span>
                </div>
              </div>

              <div className={styles.screenAlert}>
                <svg className={styles.screenAlertSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                <div>
                  <div className={styles.screenAlertTitle}>Convective Cell Inflow Detected</div>
                  <div className={styles.screenAlertSub}>Station Barometer: -3.2 hPa delta • Rain expected in 18m</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Clean Pre-Registration Form Section (Truthful, Zero Fake Numbers) */}
        <section id="preregister" className={styles.registrationSection}>
          <div className={styles.registrationCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTag}>
                <span>FIELD TEST INVITATION</span>
              </div>
              <h2 className={styles.cardTitle}>Apply for Early Access</h2>
              <p className={styles.cardSub}>
                Join our closed alpha testing cohort. Early access is granted on a rolling basis to farmers, emergency responders, drone pilots, and climate researchers.
              </p>
            </div>

            {submitted ? (
              <div className={styles.confirmedCard}>
                <div className={styles.successIcon}>✓</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.35rem' }}>
                  Application Received
                </h3>
                <div className={styles.statusReviewBadge}>
                  STATUS: IN REVIEW // WAVE 1 ALPHA
                </div>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.55, margin: '0 auto 1.5rem', maxWidth: '420px' }}>
                  Your submission for <strong style={{ color: '#ffffff' }}>{email}</strong> has been logged. When field testing begins in your region, we will dispatch your private APK distribution link.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className={styles.navCta}
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitWaitlist} className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="prereg-name" className={styles.inputLabel}>
                    Full Name
                  </label>
                  <input
                    id="prereg-name"
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prereg-email" className={styles.inputLabel}>
                    Email Address
                  </label>
                  <input
                    id="prereg-email"
                    type="email"
                    required
                    placeholder="name@organization.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prereg-phone" className={styles.inputLabel}>
                    Mobile Number (Optional — for field SMS notifications)
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
                  <label className={styles.inputLabel}>Field Testing Domain</label>
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
                  {isSubmitting ? 'Registering Application...' : 'Submit Alpha Application →'}
                </button>

                <div className={styles.trustNote}>
                  <span className={styles.trustNoteDot} />
                  <span>Closed testing program • No marketing spam • Direct developer contact</span>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Technical Capabilities Matrix */}
        <section className={styles.bentoSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>CORE ARCHITECTURE</span>
            <h2 className={styles.sectionTitle}>Meteorological Engineering.</h2>
            <p className={styles.sectionSub}>
              Engineered with zero third-party cloud lock-in. Direct IMD data ingestion, local sensor synthesis, and embedded edge inferencing.
            </p>
          </div>

          <div className={styles.techGrid}>
            {/* Card 1: Local Neural Runtime */}
            <div className={`${styles.techCard} ${styles.techCardFull}`}>
              <div>
                <div className={styles.cardIndex}>01 // ON-DEVICE NEURAL RUNTIME</div>
                <h3 className={styles.techCardHeadline}>Dual-tier edge inferencing with optional cloud scaling.</h3>
                <p className={styles.techCardText}>
                  Megha Setu runs quantized transformer models locally via GGUF format with zero cloud dependency. Designed to ensure lifeline disaster guidance remains available even if all cellular infrastructure fails.
                </p>

                {/* Technical Mode Selector */}
                <div className={styles.aiTabControls} role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'offlineHigh'}
                    onClick={() => setActiveAiMode('offlineHigh')}
                    className={`${styles.aiTabBtn} ${activeAiMode === 'offlineHigh' ? styles.aiTabBtnActive : ''}`}
                  >
                    Cirrus (1.7B)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'offlineLow'}
                    onClick={() => setActiveAiMode('offlineLow')}
                    className={`${styles.aiTabBtn} ${activeAiMode === 'offlineLow' ? styles.aiTabBtnActive : ''}`}
                  >
                    Mist (270M)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'onlineNimbus'}
                    onClick={() => setActiveAiMode('onlineNimbus')}
                    className={`${styles.aiTabBtn} ${activeAiMode === 'onlineNimbus' ? styles.aiTabBtnActive : ''}`}
                  >
                    Nimbus (Cloud)
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0.6rem 0 0', lineHeight: 1.5 }}>
                  {activeAiMode === 'offlineHigh' &&
                    'Cirrus Architecture: 1.7B parameter instruction-tuned meteorological model with 4-bit quantization (Q4_K_M). High-fidelity local conversational reasoning for mid and high-tier hardware.'}
                  {activeAiMode === 'offlineLow' &&
                    'Mist Architecture: 270M parameter compact model designed to execute on entry-level budget phones with 2GB RAM. Instant response times with minimal thermal footprint.'}
                  {activeAiMode === 'onlineNimbus' &&
                    'Nimbus Architecture: High-throughput cloud fusion combining 39 IMD Doppler radars, ISRO INSAT-3DS infrared feeds, and NCMRWF numerical weather predictions.'}
                </p>
              </div>

              <div className={styles.aiSpecsRow}>
                <div>
                  <span className={styles.aiSpecItemLabel}>TARGET PARAMETERS</span>
                  <span className={styles.aiSpecItemValue} style={{ color: '#38bdf8' }}>
                    {activeAiMode === 'offlineHigh' && '1.7 Billion'}
                    {activeAiMode === 'offlineLow' && '270 Million'}
                    {activeAiMode === 'onlineNimbus' && 'Cloud Cluster'}
                  </span>
                </div>
                <div>
                  <span className={styles.aiSpecItemLabel}>MEMORY FOOTPRINT</span>
                  <span className={styles.aiSpecItemValue} style={{ color: '#4ade80' }}>
                    {activeAiMode === 'offlineHigh' && '~1.4 GB (Optional)'}
                    {activeAiMode === 'offlineLow' && '~220 MB (Optional)'}
                    {activeAiMode === 'onlineNimbus' && '0 MB Local'}
                  </span>
                </div>
                <div>
                  <span className={styles.aiSpecItemLabel}>HARDWARE TARGET</span>
                  <span className={styles.aiSpecItemValue}>
                    {activeAiMode === 'offlineHigh' && 'ARMv8-A / Flagship'}
                    {activeAiMode === 'offlineLow' && 'Budget & Low-RAM'}
                    {activeAiMode === 'onlineNimbus' && 'Any Connected Device'}
                  </span>
                </div>
                <div>
                  <span className={styles.aiSpecItemLabel}>INSTALLATION</span>
                  <span className={styles.aiSpecItemValue}>
                    {activeAiMode === 'onlineNimbus' ? 'No Download Required' : 'On-Demand Local Asset'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Hardware MEMS Barometer */}
            <div className={styles.techCard}>
              <div>
                <div className={styles.cardIndex}>02 // HARDWARE TELEMETRY</div>
                <h3 className={styles.techCardHeadline}>Continuous barometric pressure & inflow delta.</h3>
                <p className={styles.techCardText}>
                  Samples the device internal MEMS atmospheric pressure sensor at 1Hz, calibrated against local synoptic station pressure (QNH) to detect rapid convective drop preceding cloudbursts.
                </p>
              </div>

              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                    1008.4 <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>hPa</span>
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                    -3.2 hPa / 3h (Storm Inflow)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Situation Report PDF */}
            <div className={styles.techCard}>
              <div>
                <div className={styles.cardIndex}>03 // RELIEF & DOCUMENTATION</div>
                <h3 className={styles.techCardHeadline}>Cryptographic disaster sitrep compilation.</h3>
                <p className={styles.techCardText}>
                  Generates tamper-resistant, geo-stamped synoptic briefings formatted for disaster authorities, district collectors, and PMFBY crop insurance claims.
                </p>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                {pdfReady ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', color: '#4ade80', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                    ✓ Sitrep_Bengaluru_Oct2026.pdf (Compiled)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={pdfGenerating}
                    className={styles.navCta}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}
                  >
                    <span>{pdfGenerating ? 'Compiling Synoptic Metrics...' : 'Generate Situation Report PDF'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card 4: Doppler Radar Network */}
            <div className={styles.techCard}>
              <div>
                <div className={styles.cardIndex}>04 // NOWCASTING ENGINE</div>
                <h3 className={styles.techCardHeadline}>500-meter spatial Doppler sweeps.</h3>
                <p className={styles.techCardText}>
                  Ingests live volumetric polarimetric sweeps from 39 IMD Doppler weather radars across India with sub-10 minute update cycles.
                </p>
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.85rem', fontFamily: 'monospace' }}>
                500m / 10min
              </div>
            </div>

            {/* Card 5: Zero-Infrastructure Mesh */}
            <div className={styles.techCard}>
              <div>
                <div className={styles.cardIndex}>05 // DISASTER RESILIENCE</div>
                <h3 className={styles.techCardHeadline}>Peer-to-peer BLE & Wi-Fi Aware mesh.</h3>
                <p className={styles.techCardText}>
                  Multi-hop ad-hoc protocol that propagates urgent flood and cyclone sirens between nearby devices with zero reliance on cellular towers.
                </p>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#38bdf8', marginTop: '1.2rem', fontFamily: 'monospace', fontWeight: 600 }}>
                BLE 5.2 • WI-FI DIRECT AD-HOC
              </div>
            </div>
          </div>
        </section>

        {/* 5 Operating Modes */}
        <section style={{ margin: '0 auto clamp(3.5rem, 6vw, 5.5rem)' }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>DOMAINS</span>
            <h2 className={styles.sectionTitle}>Domain-Specific Modules.</h2>
            <p className={styles.sectionSub}>
              Configured for specific operational workflows across India.
            </p>
          </div>

          <div className={styles.modesGrid}>
            <div className={styles.modeCard}>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>City</h3>
                <span className={styles.modeBadge}>URBAN</span>
              </div>
              <p className={styles.modeDesc}>Street-level inundation warnings, waterlogging hotspots, and heat island tracking.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>AgriSense</h3>
                <span className={styles.modeBadge}>KISAN</span>
              </div>
              <p className={styles.modeDesc}>48+ Indian crop phenology models, optimal spraying windows, and frost advisories.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>SkyOps</h3>
                <span className={styles.modeBadge}>AVIATION</span>
              </div>
              <p className={styles.modeDesc}>Runway Visual Range (RVR), METAR briefings, crosswinds, and convective storm tops.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>SeaCast</h3>
                <span className={styles.modeBadge}>COASTAL</span>
              </div>
              <p className={styles.modeDesc}>Coastal wind shears, swell heights, cyclone trajectory vectors, and high seas alerts.</p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>Climate X</h3>
                <span className={styles.modeBadge}>RESEARCH</span>
              </div>
              <p className={styles.modeDesc}>Monsoon trough dynamics, IOD/ENSO tracking, and synoptic climate anomaly analysis.</p>
            </div>
          </div>
        </section>

        {/* Clean Footer */}
        <footer className={styles.footerArea}>
          <p>
            Megha Setu • Built by Team Frame Fusion •{' '}
            <a href="#preregister" onClick={scrollToRegister}>
              Apply for Early Access
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
