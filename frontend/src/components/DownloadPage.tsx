'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StaggeredText from './StaggeredText';
import TileReveal from './TileReveal';
import styles from './DownloadPage.module.css';

export interface DownloadPageProps {
  onClose: () => void;
  language?: string;
}

const ARCHITECTURE_FEATURES = [
  'Live 500m IMD Doppler Radar.',
  'Offline Mesh (Zero Cell Signal).',
  'Speaks 22 Indian Languages.',
  'Kisan AI Crop Phenology Doctor.',
  'Zero-Latency Flood & Cyclone Sirens.'
];

export default function DownloadPage({ onClose }: DownloadPageProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [activeAiMode, setActiveAiMode] = useState<'offlineHigh' | 'offlineLow' | 'onlineGemini'>('offlineHigh');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % ARCHITECTURE_FEATURES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleGeneratePdf = () => {
    setPdfGenerating(true);
    setTimeout(() => {
      setPdfGenerating(false);
      setPdfReady(true);
      setTimeout(() => setPdfReady(false), 5000);
    }, 700);
  };

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

  return (
    <div
      ref={overlayRef}
      className={styles.downloadOverlay}
      style={{ backgroundColor: '#000000', color: '#f5f5f7' }}
      role="dialog"
      aria-modal="true"
      aria-label="Megha Setu Android Keynote Reveal"
      data-scroll-container="true"
    >
      {/* Sleek Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <img src="/megha_setu_phone.png" alt="Megha Setu" className={styles.brandLogo} />
          <span className={styles.brandName}>Megha Setu</span>
          <span className={styles.keynoteTag}>Special Event Preview</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close Keynote Reveal"
          title="Return to Megha Setu"
        >
          <span>Done</span>
          <span>✕</span>
        </button>
      </header>

      {/* 4-Stage Scroll Reveal Hero Component (Matching Screenshots) */}
      <TileReveal
        scrollContainerRef={overlayRef}
        headline={
          <>
            Predict every storm.
            <br />
            Protect India.
          </>
        }
        subtitle="Megha Setu for Android puts IMD Doppler radar sweeps, offline disaster mesh alerts, and Kisan AI crop guidance directly into your hands."
      />

      {/* Main Keynote Content & Features Below */}
      <div className={styles.container}>
        {/* Next-Gen Architecture & Live Preview Section */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            <span>🇮🇳 Official Preview • Coming Soon Application</span>
          </div>

          {/* Revealing Typography Animation */}
          <div className={styles.revealHeadlineCluster}>
            <span className={styles.vaporLabel}>Android Architecture</span>
            <div className={styles.revealTextFrame}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={featureIndex}
                  initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -16, filter: 'blur(10px)' }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className={styles.revealTextWord}
                >
                  {ARCHITECTURE_FEATURES[featureIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Action Call to Pre-Register for Early Access */}
          <div className={styles.actionCluster}>
            <button
              type="button"
              className={styles.primaryCta}
              onClick={() => {
                window.location.href = '/waitlist';
              }}
              id="apple-keynote-preregister-btn"
            >
              <span>🚀 Pre-Register for Early Access</span>
            </button>
            <div className={styles.ctaMeta}>
              <span className={styles.statusBadge}>In Active Development</span>
              <span className={styles.ctaMetaDot} />
              <span>Target Launch: Q2 2026 Android Application</span>
              <span className={styles.ctaMetaDot} />
              <span>Android 8.0 — 15+</span>
            </div>
          </div>
        </motion.section>

        {/* Floating Device Silhouette Showcase */}
        <motion.section
          className={styles.showcaseWrapper}
          aria-label="Device Preview"
          initial={{ opacity: 0, y: 45, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.deviceMockupFrame}>
            <div className={styles.deviceScreen}>
              <div className={styles.screenDynamicIsland} />

              <div className={styles.screenTopInfo}>
                <div className={styles.screenCity}>Bengaluru, Karnataka</div>
                <div className={styles.screenTemp}>24°</div>
                <div className={styles.screenCondition}>Thunderstorm Warning • Doppler Tracked</div>
              </div>

              {/* Scanning Radar Visual with Coming Soon Animation */}
              <div className={styles.screenRadarVisual} aria-hidden="true">
                <div className={styles.radarSweepBeam} />
                <div className={styles.radarPulse1} />
                <div className={styles.radarPulse2} />
                <div className={styles.radarPulse3} />

                {/* Apple-Grade Coming Soon Floating Holographic Badge */}
                <div className={styles.comingSoonCenterCard}>
                  <div className={styles.comingSoonLiveBadge}>
                    <span className={styles.comingSoonLiveDot} />
                    <span>LAUNCHING Q2 2026</span>
                  </div>
                  <div className={styles.comingSoonShimmerTitle}>COMING SOON</div>
                  <div className={styles.comingSoonSubText}>Megha Setu for Android</div>
                  <div className={styles.comingSoonProgressTrack}>
                    <div className={styles.comingSoonProgressBar} />
                  </div>
                  <div className={styles.comingSoonMetaStatus}>
                    <span>Android Application Closed Beta • 88% Ready</span>
                  </div>
                </div>
              </div>

              <div className={styles.screenBottomAlert}>
                <span className={styles.screenAlertIcon}>⚡</span>
                <div>
                  <div className={styles.screenAlertTitle}>Severe Convective Cell Detected</div>
                  <div className={styles.screenAlertSub}>IMD Doppler Radar: Rain expected in 18 mins</div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.deviceReflection} aria-hidden="true" />

          {/* Floating Feature Chips */}
          <div className={styles.chipCluster}>
            <span className={styles.featureChip}>📡 39 IMD Doppler Radars</span>
            <span className={styles.featureChip}>📶 Zero-Infrastructure BLE Mesh</span>
            <span className={styles.featureChip}>🗣️ 22 Indic Voice Models</span>
            <span className={styles.featureChip}>🌾 48+ Crop Phenology Models</span>
            <span className={styles.featureChip}>🚨 NDMA Emergency Sirens</span>
            <span className={styles.featureChip}>🛰️ ISRO INSAT-3DS Radiance</span>
          </div>
        </motion.section>

        {/* 5 Specialized Operating Modes */}
        <motion.section
          className={styles.modesSection}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>Multi-Domain OS</div>
            <h2 className={styles.sectionTitle}>5 Specialized Modes. One App.</h2>
            <p className={styles.sectionSub}>
              Engineered for farmers, pilots, fishermen, city dwellers, and climate researchers across India.
            </p>
          </div>

          <div className={styles.modesGrid}>
            <div className={styles.modeCard}>
              <div className={styles.modeIconBadge} style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0.05) 100%)' }}>
                🏙️
              </div>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>City Mode</h3>
                <span className={styles.modeTag}>Urban</span>
              </div>
              <p className={styles.modeDesc}>
                Waterlogging alerts, storm drains, street-level downpour radar, and heat island indexes.
              </p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIconBadge} style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.05) 100%)' }}>
                🌾
              </div>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>AgriSense</h3>
                <span className={styles.modeTag}>Kisan AI</span>
              </div>
              <p className={styles.modeDesc}>
                Hyper-local advisory for 48+ Indian crops. Spraying windows, frost, and soil moisture forecasts.
              </p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIconBadge} style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.05) 100%)' }}>
                ✈️
              </div>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>SkyOps</h3>
                <span className={styles.modeTag}>Aviation</span>
              </div>
              <p className={styles.modeDesc}>
                Runway Visual Range (RVR), METAR/TAF briefings, crosswind alerts, and storm cloud-top heights.
              </p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIconBadge} style={{ background: 'radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(20, 184, 166, 0.05) 100%)' }}>
                ⚓
              </div>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>SeaCast</h3>
                <span className={styles.modeTag}>Marine</span>
              </div>
              <p className={styles.modeDesc}>
                Coastal winds, swell heights, cyclone trajectory maps, and high seas advisories for fishermen.
              </p>
            </div>

            <div className={styles.modeCard}>
              <div className={styles.modeIconBadge} style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.05) 100%)' }}>
                🔬
              </div>
              <div className={styles.modeHeader}>
                <h3 className={styles.modeTitle}>Climate X</h3>
                <span className={styles.modeTag}>Research</span>
              </div>
              <p className={styles.modeDesc}>
                Monsoon trough movement, ENSO/IOD indexes, and 50-year historical climate anomaly tracking.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Keynote Bento Grid: Flagship Apple-Grade Capabilities */}
        <motion.section
          className={styles.bentoSection}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.bentoHeader}>
            <StaggeredText
              text="Engineered for India’s extremes."
              as="h2"
              className={styles.bentoTitle}
              segmentBy="words"
              delay={40}
              duration={0.7}
              direction="bottom"
              blur={true}
            />
            <StaggeredText
              text="Groundbreaking disaster defense and meteorological capabilities built directly into the Android application."
              as="p"
              className={styles.bentoSub}
              segmentBy="words"
              delay={20}
              duration={0.6}
              direction="bottom"
              blur={true}
            />
          </div>

          <div className={styles.bentoGrid}>
            {/* Bento Card A: Barometric Air Pressure & Storm Drop Sensor */}
            <div className={`${styles.bentoCard} ${styles.bentoCol6}`}>
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

              {/* Barometer Micro-Widget */}
              <div className={styles.pressureWidget}>
                <div className={styles.pressureGaugeRow}>
                  <div className={styles.pressureValueCluster}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span className={styles.pressureNumber}>1008.4</span>
                      <span className={styles.pressureUnit}>hPa</span>
                    </div>
                    <span className={styles.pressureTrendBadge}>
                      ▼ -3.2 hPa / 3h • Storm Inflow Drop
                    </span>
                  </div>

                  {/* SVG Radial Barometer Arc Dial */}
                  <div className={styles.pressureSvgWrap}>
                    <svg viewBox="0 0 110 65" width="100%" height="100%" aria-hidden="true">
                      <defs>
                        <linearGradient id="pressureArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="65%" stopColor="#c084fc" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                      {/* Background Track Arc */}
                      <path
                        d="M 12 55 A 42 42 0 0 1 98 55"
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      {/* Active Pressure Arc */}
                      <path
                        d="M 12 55 A 42 42 0 0 1 65 14"
                        fill="none"
                        stroke="url(#pressureArcGrad)"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />
                      {/* Center Needle Pivot */}
                      <circle cx="55" cy="55" r="5" fill="#ffffff" />
                      <line x1="55" y1="55" x2="68" y2="18" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                <div className={styles.pressureMetaRow}>
                  <span>Station Elevation: 920m ASL</span>
                  <span>QNH Synoptic Corrected</span>
                </div>
              </div>
            </div>

            {/* Bento Card B: Celestial Moon & Tide Ephemeris */}
            <div className={`${styles.bentoCard} ${styles.bentoCol6}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>🌙</span>
                  <span>Celestial Ephemeris • Nocturnal Intel</span>
                </div>
                <h3 className={styles.bentoHeadline}>Lunar illumination & coastal spring tides.</h3>
                <p className={styles.bentoText}>
                  Astronomical ephemeris calculated on-device for nocturnal farm watering, night navigation, and gravitational coastal tidal surges.
                </p>
              </div>

              {/* Moon Visual Micro-Widget */}
              <div className={styles.moonWidget}>
                <div className={styles.moonHeaderRow}>
                  <div className={styles.moonOrbVisual}>
                    <div className={styles.moonOrbCrater1} />
                    <div className={styles.moonOrbCrater2} />
                  </div>
                  <div className={styles.moonPhaseText}>
                    <span className={styles.moonPhaseName}>Waxing Gibbous</span>
                    <span className={styles.moonPhaseIllum}>84% Illumination • Next Full Moon in 3 Days</span>
                  </div>
                </div>

                <div className={styles.moonEphemerisGrid}>
                  <div className={styles.moonEphemerisItem}>
                    <span className={styles.moonEphemerisLabel}>Moonrise</span>
                    <span className={styles.moonEphemerisValue}>17:48 IST</span>
                  </div>
                  <div className={styles.moonEphemerisItem}>
                    <span className={styles.moonEphemerisLabel}>Moonset</span>
                    <span className={styles.moonEphemerisValue}>05:32 IST</span>
                  </div>
                  <div className={styles.moonEphemerisItem}>
                    <span className={styles.moonEphemerisLabel}>Coastal Tide</span>
                    <span className={styles.moonEphemerisValue} style={{ color: '#38bdf8' }}>Spring Tide (+2.4m)</span>
                  </div>
                  <div className={styles.moonEphemerisItem}>
                    <span className={styles.moonEphemerisLabel}>High Tide Time</span>
                    <span className={styles.moonEphemerisValue}>21:15 IST</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card C: Everyday Lifestyle Weather (For Normal People) */}
            <div className={`${styles.bentoCard} ${styles.bentoCol6}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>🏃</span>
                  <span>Daily Life • Hyper-Local Activities</span>
                </div>
                <h3 className={styles.bentoHeadline}>Tailored for your day-to-day routine.</h3>
                <p className={styles.bentoText}>
                  Practical daily recommendations for fitness, commuting, outdoor laundry, and family health without decoding complex synoptic charts.
                </p>
              </div>

              {/* Lifestyle Matrix Micro-Widget */}
              <div className={styles.lifestyleWidget}>
                <div className={styles.activityPillCard}>
                  <div className={styles.activityCardHeader}>
                    <div className={styles.activityIconName}>
                      <span>🏃</span>
                      <span>Morning Run</span>
                    </div>
                    <span className={styles.activityScoreBadge}>92/100</span>
                  </div>
                  <div className={styles.activityCondition}>Optimal • 22°C Cool Breeze</div>
                  <div className={styles.activitySubDesc}>Best window: 6:00 AM – 8:30 AM before heat builds up.</div>
                </div>

                <div className={styles.activityPillCard}>
                  <div className={styles.activityCardHeader}>
                    <div className={styles.activityIconName}>
                      <span>👕</span>
                      <span>Laundry Dry</span>
                    </div>
                    <span className={styles.activityScoreBadge} style={{ color: '#22c55e', background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }}>
                      2h 15m
                    </span>
                  </div>
                  <div className={styles.activityCondition}>Fast Drying Window</div>
                  <div className={styles.activitySubDesc}>High solar irradiance until 3:30 PM showers.</div>
                </div>

                <div className={styles.activityPillCard}>
                  <div className={styles.activityCardHeader}>
                    <div className={styles.activityIconName}>
                      <span>🛵</span>
                      <span>Commute</span>
                    </div>
                    <span className={styles.activityScoreBadge} style={{ color: '#eab308', background: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)' }}>
                      Caution
                    </span>
                  </div>
                  <div className={styles.activityCondition}>Rain Caution after 18:00</div>
                  <div className={styles.activitySubDesc}>Pack rainwear for two-wheeler evening commute.</div>
                </div>

                <div className={styles.activityPillCard}>
                  <div className={styles.activityCardHeader}>
                    <div className={styles.activityIconName}>
                      <span>🍃</span>
                      <span>Air & UV</span>
                    </div>
                    <span className={styles.activityScoreBadge}>AQI 42</span>
                  </div>
                  <div className={styles.activityCondition}>Clean Air • UV Index 3</div>
                  <div className={styles.activitySubDesc}>Low pollution index; safe for children and seniors.</div>
                </div>
              </div>
            </div>

            {/* Bento Card D: Instant Situation PDF Report Generation */}
            <div className={`${styles.bentoCard} ${styles.bentoCol6}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>📄</span>
                  <span>Documentation • Relief & Claims</span>
                </div>
                <h3 className={styles.bentoHeadline}>1-Tap weather & disaster situation PDF.</h3>
                <p className={styles.bentoText}>
                  Instantly compile and export formal, geo-tagged meteorological incident briefings formatted for Panchayats, DDMA authorities, and crop insurance claims.
                </p>
              </div>

              {/* PDF Document Preview Micro-Widget */}
              <div className={styles.pdfWidget}>
                <div className={styles.pdfMockupPaper}>
                  <div className={styles.pdfPaperHeader}>
                    <span className={styles.pdfDocTitle}>Megha Setu • Synoptic Incident Sitrep</span>
                    <span className={styles.pdfStamp}>Official Proof</span>
                  </div>
                  <div className={styles.pdfDataPreview}>
                    <div className={styles.pdfDataCol}>
                      <span>Peak Rainfall</span>
                      <span>84.2 mm/h</span>
                    </div>
                    <div className={styles.pdfDataCol}>
                      <span>Peak Wind Gust</span>
                      <span>62 km/h</span>
                    </div>
                    <div className={styles.pdfDataCol}>
                      <span>NDMA Level</span>
                      <span style={{ color: '#f87171' }}>Level 3 Severe</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.4rem' }}>
                    Geo: 12.9716° N, 77.5946° E • Cryptographic Hash: 8f4a...29b1
                  </div>
                </div>

                {pdfReady ? (
                  <div className={styles.pdfSuccessNotification}>
                    <span>✓</span>
                    <span>Situation_Report_Bengaluru_Oct2026.pdf Ready (1.4 MB)</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    className={styles.pdfGenerateButton}
                    disabled={pdfGenerating}
                  >
                    <span>{pdfGenerating ? '⏳ Compiling Isohyets & Data...' : '📄 Generate Situation Report PDF (A4)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bento Card E: 3 AI Modes (Offline High-RAM, Offline Low-RAM, Online Gemini) */}
            <div className={`${styles.bentoCard} ${styles.bentoCol12}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>🧠</span>
                  <span>Neural Engine Architecture • 3 AI Modes (Totally Optional)</span>
                </div>
                <h3 className={styles.bentoHeadline}>3 Intelligent AI modes. Optimized for every phone.</h3>
                <p className={styles.bentoText}>
                  Two dedicated 100% offline edge models tailored for higher-RAM and low-RAM budget devices, plus Google Gemini online mode. <span style={{ color: '#38bdf8', fontWeight: 600 }}>Totally optional:</span> offline models download on-demand only if you choose to enable zero-internet local intelligence.
                </p>
              </div>

              {/* Interactive Segmented Selector for 3 Modes */}
              <div className={styles.aiModelWidget}>
                <div className={styles.aiSegmentedControl} role="tablist" aria-label="Select AI Architecture">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'offlineHigh'}
                    onClick={() => setActiveAiMode('offlineHigh')}
                    className={`${styles.aiSegmentBtn} ${activeAiMode === 'offlineHigh' ? styles.aiSegmentBtnActive : ''}`}
                  >
                    <span>☁️ Cirrus (Qwen3 1.7B)</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'offlineLow'}
                    onClick={() => setActiveAiMode('offlineLow')}
                    className={`${styles.aiSegmentBtn} ${activeAiMode === 'offlineLow' ? styles.aiSegmentBtnActive : ''}`}
                  >
                    <span>🌫️ Mist (Gemma 3 270M)</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeAiMode === 'onlineGemini'}
                    onClick={() => setActiveAiMode('onlineGemini')}
                    className={`${styles.aiSegmentBtn} ${activeAiMode === 'onlineGemini' ? styles.aiSegmentBtnActive : ''}`}
                  >
                    <span>⚡ Nimbus (Gemini Online)</span>
                  </button>
                </div>

                {/* Dynamic Spec Showcase for Selected Model */}
                <div className={styles.aiModelShowcase}>
                  <div className={styles.aiModelHeaderRow}>
                    <div className={styles.aiModelTitle}>
                      {activeAiMode === 'offlineHigh' && 'Cirrus (high, light cloud) • Qwen3 1.7B, Q4_K_M'}
                      {activeAiMode === 'offlineLow' && 'Mist • Gemma 3 270M, Q4_K_M'}
                      {activeAiMode === 'onlineGemini' && 'Nimbus (cloud type) • Google Gemini Synoptic AI'}
                    </div>
                    <span
                      className={`${styles.aiModelTag} ${
                        activeAiMode === 'offlineHigh'
                          ? styles.aiTagOnDevice
                          : activeAiMode === 'offlineLow'
                          ? styles.aiTagBudget
                          : styles.aiTagCloud
                      }`}
                    >
                      {activeAiMode === 'offlineHigh' && '100% Offline • Optional Download'}
                      {activeAiMode === 'offlineLow' && '100% Offline • Optional Download'}
                      {activeAiMode === 'onlineGemini' && 'Online Mode • Cloud Supercomputing'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', margin: 0, lineHeight: 1.5 }}>
                    {activeAiMode === 'offlineHigh' &&
                      'Cirrus: Non-thinking high-altitude reasoning engine running via llama_cpp_flutter. High-quality offline conversational reasoning and dialect voice assistance designed for mid-to-high tier Android phones.'}
                    {activeAiMode === 'offlineLow' &&
                      'Mist: Highly compact 270M parameter weights optimized to run everywhere, including budget phones with constrained RAM. Ultra-lightweight and efficient.'}
                    {activeAiMode === 'onlineGemini' &&
                      'Nimbus: Connects to cloud supercomputing clusters when internet is available. Fuses 39 Doppler radar sweeps, ISRO INSAT-3DS multi-spectral radiance feeds, and numerical WRF weather prediction equations.'}
                  </p>

                  <div className={styles.aiSpecsGrid}>
                    <div className={styles.aiSpecItem}>
                      <span className={styles.aiSpecItemLabel}>Cloud Codename</span>
                      <span className={styles.aiSpecItemValue} style={{ color: '#38bdf8' }}>
                        {activeAiMode === 'offlineHigh' && 'Cirrus (high, light cloud)'}
                        {activeAiMode === 'offlineLow' && 'Mist'}
                        {activeAiMode === 'onlineGemini' && 'Nimbus (cloud type)'}
                      </span>
                    </div>

                    <div className={styles.aiSpecItem}>
                      <span className={styles.aiSpecItemLabel}>Model Size</span>
                      <span
                        className={styles.aiSpecItemValue}
                        style={{
                          color:
                            activeAiMode === 'offlineHigh'
                              ? '#4ade80'
                              : activeAiMode === 'offlineLow'
                              ? '#38bdf8'
                              : '#c084fc'
                        }}
                      >
                        {activeAiMode === 'offlineHigh' && '~1.4 GB (Optional)'}
                        {activeAiMode === 'offlineLow' && '~220 MB (Optional)'}
                        {activeAiMode === 'onlineGemini' && '0 MB Local (Cloud API)'}
                      </span>
                    </div>

                    <div className={styles.aiSpecItem}>
                      <span className={styles.aiSpecItemLabel}>Target Hardware</span>
                      <span className={styles.aiSpecItemValue}>
                        {activeAiMode === 'offlineHigh' && 'Higher-RAM phones (Mid & Flagship)'}
                        {activeAiMode === 'offlineLow' && 'Low-RAM phones & Budget devices'}
                        {activeAiMode === 'onlineGemini' && 'All connected Android devices'}
                      </span>
                    </div>

                    <div className={styles.aiSpecItem}>
                      <span className={styles.aiSpecItemLabel}>Download Status</span>
                      <span className={styles.aiSpecItemValue} style={{ color: '#e2e8f0' }}>
                        {activeAiMode === 'offlineHigh' && 'Totally Optional (On-Demand)'}
                        {activeAiMode === 'offlineLow' && 'Totally Optional (On-Demand)'}
                        {activeAiMode === 'onlineGemini' && 'No Local Download Required'}
                      </span>
                    </div>
                  </div>

                  {/* Meteorological Cloud Architecture Table (Matching Spec) */}
                  <div className={styles.cloudNamingTableWrapper}>
                    <div className={styles.cloudNamingTableHeader}>
                      <span style={{ fontSize: '0.92rem' }}>☁️</span>
                      <span className={styles.cloudNamingTableTitle}>Cloud Model Architecture</span>
                    </div>
                    <table className={styles.cloudNamingTable}>
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Name</th>
                          <th>Deployment Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          onClick={() => setActiveAiMode('onlineGemini')}
                          className={activeAiMode === 'onlineGemini' ? styles.cloudRowActive : styles.cloudRow}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className={styles.tableColModel}>Gemini</td>
                          <td className={styles.tableColName}>
                            <strong className={styles.cloudNameHighlight}>Nimbus</strong>{' '}
                            <span className={styles.cloudSubNote}>(cloud type)</span>
                          </td>
                          <td className={styles.tableColDeploy}>Online Cloud (Synoptic Fusion)</td>
                        </tr>
                        <tr
                          onClick={() => setActiveAiMode('offlineHigh')}
                          className={activeAiMode === 'offlineHigh' ? styles.cloudRowActive : styles.cloudRow}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className={styles.tableColModel}>Qwen3 1.7B</td>
                          <td className={styles.tableColName}>
                            <strong className={styles.cloudNameHighlight}>Cirrus</strong>{' '}
                            <span className={styles.cloudSubNote}>(high, light cloud)</span>
                          </td>
                          <td className={styles.tableColDeploy}>100% Offline (Higher-RAM)</td>
                        </tr>
                        <tr
                          onClick={() => setActiveAiMode('offlineLow')}
                          className={activeAiMode === 'offlineLow' ? styles.cloudRowActive : styles.cloudRow}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className={styles.tableColModel}>Gemma 3 270M</td>
                          <td className={styles.tableColName}>
                            <strong className={styles.cloudNameHighlight}>Mist</strong>
                          </td>
                          <td className={styles.tableColDeploy}>100% Offline (Low-RAM Budget)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Totally Optional Note Callout */}
                  <div
                    style={{
                      marginTop: '0.85rem',
                      padding: '0.65rem 0.95rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>💡</span>
                    <span>
                      <strong style={{ color: '#f1f5f9' }}>Totally Optional:</strong> You are never forced to download local models. The base Megha Setu APK remains ultra-lightweight. You can use the app without downloading any local models, or download either model on-demand whenever needed.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card F: Doppler Ultra */}
            <div className={`${styles.bentoCard} ${styles.bentoCol8}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>📡</span>
                  <span>Doppler Radar & Storm Nowcasting</span>
                </div>
                <h3 className={styles.bentoHeadline}>500-meter reflective radar sweeps.</h3>
                <p className={styles.bentoText}>
                  Track storm clouds, hail, and squall lines across India with ultra-low latency directly
                  from 39 Indian Doppler Weather Radars.
                </p>
              </div>
              <div className={styles.bentoBigStat}>500m</div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#86868b' }}>
                  <span>Development Progress</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>88% • Launching Q2 2026</span>
                </div>
                <div className={styles.bentoProgressTrack}>
                  <div className={styles.bentoProgressBar} style={{ width: '88%' }} />
                </div>
              </div>
            </div>

            {/* Bento Card G: Offline Disaster Mesh */}
            <div className={`${styles.bentoCard} ${styles.bentoCol4}`}>
              <div>
                <div className={styles.bentoTag}>
                  <span>📶</span>
                  <span>Zero Infrastructure</span>
                </div>
                <h3 className={styles.bentoHeadline}>Offline Disaster Mesh.</h3>
                <p className={styles.bentoText}>
                  Peer-to-peer BLE and Wi-Fi Direct communication relaying SOS alerts between villagers
                  when cell towers are down.
                </p>
              </div>
              <div style={{ marginTop: '2rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📶</span>
                <div style={{ fontSize: '0.78rem', color: '#86868b', marginTop: '0.5rem' }}>
                  <span>Coming Q2 2026</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Technical Architecture & Specs (Truthful & Sensor-Driven, NO 2G) */}
        <motion.section
          className={styles.specsSection}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>Architecture</div>
            <h2 className={styles.sectionTitle}>Engineered for Every Android Phone.</h2>
            <p className={styles.sectionSub}>
              Engineered for extreme reliability and disaster resilience across all Indian states.
            </p>
          </div>

          <div className={styles.specsGrid}>
            <div className={styles.specCard}>
              <div className={styles.specValue}>39 Radars</div>
              <h3 className={styles.specTitle}>IMD Doppler Network</h3>
              <p className={styles.specDesc}>
                Direct streaming connection to India Meteorological Department radars nationwide.
              </p>
            </div>

            <div className={styles.specCard}>
              <div className={styles.specValue}>100% Offline</div>
              <h3 className={styles.specTitle}>Emergency Local Cache</h3>
              <p className={styles.specDesc}>
                State and district evacuation shelters stored locally in embedded SQLite database.
              </p>
            </div>

            <div className={styles.specCard}>
              <div className={styles.specValue}>22 Languages</div>
              <h3 className={styles.specTitle}>Indic Voice Recognition</h3>
              <p className={styles.specDesc}>
                On-device dialect-tuned speech AI models with zero reliance on cloud typing.
              </p>
            </div>

            <div className={styles.specCard}>
              <div className={styles.specValue}>Sub-50ms</div>
              <h3 className={styles.specTitle}>Hardware Sensor Fusion</h3>
              <p className={styles.specDesc}>
                Synthesizes onboard MEMS barometer, GNSS, and mobile neural accelerators with zero cloud delay.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Development Roadmap */}
        <motion.section
          className={styles.roadmapSection}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>Roadmap</div>
            <h2 className={styles.sectionTitle}>Development Timeline.</h2>
            <p className={styles.sectionSub}>
              From research prototype to nationwide life-safety deployment.
            </p>
          </div>

          <div className={styles.roadmapGrid}>
            <div className={styles.roadmapCard}>
              <div className={styles.roadmapHeader}>
                <span className={styles.roadmapQuarter}>Q4 2025</span>
                <span className={styles.roadmapStatusDone}>Completed ✓</span>
              </div>
              <h3 className={styles.roadmapTitle}>Radar & AI Core</h3>
              <p className={styles.roadmapDesc}>
                Doppler composite pipeline and nowcasting transformer models validated.
              </p>
            </div>

            <div className={styles.roadmapCard}>
              <div className={styles.roadmapHeader}>
                <span className={styles.roadmapQuarter}>Q1 2026</span>
                <span className={styles.roadmapStatusDone}>Completed ✓</span>
              </div>
              <h3 className={styles.roadmapTitle}>22 Indic Languages</h3>
              <p className={styles.roadmapDesc}>
                Multilingual voice synthesis and INSAT-3DS satellite streaming pipeline integrated.
              </p>
            </div>

            <div className={styles.roadmapCard}>
              <div className={styles.roadmapHeader}>
                <span className={styles.roadmapQuarter}>Q2 2026</span>
                <span className={styles.roadmapStatusActive}>Active • 88%</span>
              </div>
              <h3 className={styles.roadmapTitle}>Closed Field Trials</h3>
              <p className={styles.roadmapDesc}>
                Disaster mesh field testing in flood-prone districts and closed pilot user group.
              </p>
            </div>

            <div className={styles.roadmapCard}>
              <div className={styles.roadmapHeader}>
                <span className={styles.roadmapQuarter}>Q3 2026</span>
                <span className={styles.roadmapStatusUpcoming}>Coming Soon</span>
              </div>
              <h3 className={styles.roadmapTitle}>Application Launch</h3>
              <p className={styles.roadmapDesc}>
                Public production release nationwide with zero-latency emergency sirens.
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
