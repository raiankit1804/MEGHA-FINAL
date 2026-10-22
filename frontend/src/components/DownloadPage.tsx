'use client';

import React, { useEffect, useRef } from 'react';
import styles from './DownloadPageAntigravity.module.css';

export interface DownloadPageProps {
  onClose: () => void;
  language?: string;
}

// Beta APK served from /public (Drive always shows a scan warning for APKs).
// If this is ever empty, the buttons fall back to a "coming soon" state.
const APK_DOWNLOAD_URL = '/megha-setu-beta.apk';

const KEY_FEATURES = [
  {
    tag: 'OFFLINE AI',
    title: 'Weather intelligence that works without internet',
    text: 'Run a compact language model on your phone and keep getting guidance when the network is gone. Pick Cirrus (1.7B) for capable phones or Mist (270M) for budget phones with 2 GB RAM. Online, Nimbus uses the cloud for the best answers.',
    points: ['Optional on-device model download', 'Works on low-RAM phones', 'Falls back automatically if a service is down'],
  },
  {
    tag: 'SAFETY',
    title: 'Alerts and SOS when it matters',
    text: 'Risk levels are computed by a deterministic engine, not guessed by AI, so alerts stay consistent and trustworthy. One tap opens emergency helplines, and a Bluetooth mesh can pass urgent alerts between nearby phones when towers are down.',
    points: ['One-tap SOS with 8 emergency services', 'Peer-to-peer BLE alert mesh', 'Rule-based risk scoring'],
  },
  {
    tag: 'FOR INDIA',
    title: 'Built for how India speaks and works',
    text: 'Ask by voice or text in 22 Indian languages. Switch to a mode built for your work, from farm advisories to aviation briefings, and get answers in the language you think in.',
    points: ['22 Indic languages, voice and text', '5 domain modes', 'Data from IMD radars and global models'],
  },
];

const FEATURES = [
  { title: 'Hyperlocal forecasts', text: 'Live temperature, rain nowcasts and conditions for your exact location.' },
  { title: 'Live weather animations', text: 'Sun, cloud, rain, fog, snow and thunderstorm scenes that match the sky outside.' },
  { title: 'AI weather assistant', text: 'Ask in plain language and get answers grounded in real forecast data.' },
  { title: 'Radar nowcasting', text: 'Doppler radar from 39 IMD stations, so you can see rain coming.' },
  { title: 'Barometer insight', text: 'Uses your phone’s pressure sensor to spot sudden drops that come before storms.' },
  { title: 'Situation reports', text: 'Generate a clean weather briefing to share with authorities or for crop claims.' },
];

const MODES = [
  { name: 'City', tag: 'Urban', text: 'Waterlogging, heat and commute alerts.' },
  { name: 'AgriSense', tag: 'Farming', text: 'Crop advice, spray windows, frost warnings.' },
  { name: 'SkyOps', tag: 'Aviation', text: 'Winds, visibility and storm tops for pilots and drones.' },
  { name: 'SeaCast', tag: 'Coastal', text: 'Swell, coastal winds and cyclone tracking.' },
  { name: 'Climate X', tag: 'Research', text: 'Monsoon, ENSO and anomaly analysis.' },
];

const STEPS = [
  'Tap Download for Android above.',
  'Open the downloaded file. If asked, allow “Install unknown apps” for your browser.',
  'Open Megha Setu and ask your first question.',
];

export default function DownloadPage({ onClose }: DownloadPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasLink = APK_DOWNLOAD_URL.length > 0;

  // Reveal sections as they scroll into view
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>('[data-reveal]');
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add(styles.revealed));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.revealed);
            io.unobserve(e.target);
          }
        });
      },
      { root, threshold: 0.15 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const DownloadButton = ({ id }: { id: string }) =>
    hasLink ? (
      <a
        id={id}
        href={APK_DOWNLOAD_URL}
        download="MeghaSetu-beta.apk"
        className={styles.primaryCta}
      >
        Download for Android
      </a>
    ) : (
      <button id={id} type="button" disabled className={styles.primaryCta}>
        Download link coming soon
      </button>
    );

  return (
    <div
      ref={rootRef}
      className={styles.downloadOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Download Megha Setu for Android"
    >
      <div className={styles.ambientBackdrop} aria-hidden="true">
        <div className={styles.glowTop} />
        <div className={styles.dotGrid} />
      </div>

      <header className={styles.topBar}>
        <div className={styles.brandGroup}>
          <img src="/megha_setu_phone.png" alt="" className={styles.brandLogo} />
          <span className={styles.brandName}>Megha Setu</span>
        </div>
        <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Back to Megha Setu">
          <span>Back</span>
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <main className={styles.container}>
        <section className={styles.hero}>
          <span className={`${styles.betaPill} ${styles.rise}`} style={{ animationDelay: '0ms' }}>
            <span className={styles.pulseDot} />
            Beta version available
          </span>
          <h1 className={`${styles.heroTitle} ${styles.rise}`} style={{ animationDelay: '100ms' }}>
            Megha Setu for Android
          </h1>
          <p className={`${styles.heroSubtitle} ${styles.rise}`} style={{ animationDelay: '200ms' }}>
            Weather intelligence for India, in your pocket. The beta is open. Download the APK, try it out, and tell us what to improve.
          </p>
          <div className={`${styles.heroCtaCluster} ${styles.rise}`} style={{ animationDelay: '300ms' }}>
            <DownloadButton id="hero-download-cta" />
            <a href="#features" className={styles.secondaryCta}>
              See features
            </a>
          </div>
          <p className={`${styles.heroNote} ${styles.rise}`} style={{ animationDelay: '400ms' }}>
            Android 8.0+ · Allow “Install unknown apps” when prompted
          </p>
        </section>

        <section className={`${styles.showcaseSection} ${styles.rise}`} style={{ animationDelay: '500ms' }} aria-hidden="true">
          <div className={styles.deviceMockupFrame}>
            <div className={styles.deviceScreen}>
              <div className={styles.dynamicIsland} />
              <div className={styles.screenHeader}>
                <div>
                  <div className={styles.screenCity}>Bengaluru</div>
                  <div className={styles.screenCondition}>Light rain expected</div>
                </div>
                <div className={styles.screenTemp}>24°</div>
              </div>
              <div className={styles.radarContainer}>
                <div className={styles.radarRings}>
                  <div className={styles.radarRing1} />
                  <div className={styles.radarRing2} />
                  <div className={styles.radarRing3} />
                </div>
                <div className={styles.radarSweep} />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className={styles.featureSection}>
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionTag}>KEY FEATURES</span>
            <h2 className={styles.sectionTitle}>What makes it different.</h2>
          </div>
          <div className={styles.keyGrid}>
            {KEY_FEATURES.map((f, i) => (
              <article
                key={f.tag}
                data-reveal
                className={`${styles.keyCard} ${styles.reveal}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className={styles.keyTag}>{f.tag}</span>
                <h3 className={styles.keyTitle}>{f.title}</h3>
                <p className={styles.keyText}>{f.text}</p>
                <ul className={styles.keyList}>
                  {f.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.featureSection}>
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionTag}>AND MORE</span>
            <h2 className={styles.sectionTitle}>Everything in one app.</h2>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-reveal
                className={`${styles.featureCard} ${styles.reveal}`}
                style={{ transitionDelay: `${(i % 3) * 80}ms` }}
              >
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureText}>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.featureSection}>
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionTag}>MODES</span>
            <h2 className={styles.sectionTitle}>Pick the mode for your work.</h2>
          </div>
          <div className={styles.modeRow}>
            {MODES.map((m, i) => (
              <div
                key={m.name}
                data-reveal
                className={`${styles.modeChip} ${styles.reveal}`}
                style={{ transitionDelay: `${(i % 3) * 60}ms` }}
              >
                <div className={styles.modeChipHead}>
                  <strong>{m.name}</strong>
                  <span>{m.tag}</span>
                </div>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.featureSection}>
          <div className={`${styles.sectionHeader} ${styles.reveal}`} data-reveal>
            <span className={styles.sectionTag}>INSTALL</span>
            <h2 className={styles.sectionTitle}>Up and running in a minute.</h2>
          </div>
          <ol className={styles.stepList}>
            {STEPS.map((t, i) => (
              <li key={t} data-reveal className={`${styles.stepItem} ${styles.reveal}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.finalCta} ${styles.reveal}`} data-reveal>
          <h2 className={styles.sectionTitle}>Try the beta today.</h2>
          <p className={styles.sectionSub}>Found a bug or have an idea? Your feedback shapes the release.</p>
          <div className={styles.heroCtaCluster}>
            <DownloadButton id="footer-download-cta" />
          </div>
        </section>

        <footer className={styles.footerArea}>
          <p>Megha Setu · Built by Team Frame Fusion</p>
        </footer>
      </main>
    </div>
  );
}
