'use client';

import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import styles from './TileReveal.module.css';

export interface TileRevealProps {
  headline?: React.ReactNode;
  subtitle?: React.ReactNode;
  buttonText?: string;
  onButtonClick?: () => void;
  scrollContainerRef?: React.RefObject<HTMLElement>;
  className?: string;
  style?: React.CSSProperties;
}

// 9 Graphic Art SVGs matching the exact artwork from user screenshots
const TileSvg1 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg1-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1E0438" />
        <stop offset="100%" stopColor="#320757" />
      </linearGradient>
      <linearGradient id="svg1-pink" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#FF2A85" />
        <stop offset="60%" stopColor="#F43F5E" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg1-bg)" />
    <path d="M 0 0 L 140 0 L 140 50 L 100 50 L 100 120 L 35 120 L 35 160 L 0 160 Z" fill="url(#svg1-pink)" />
    <path d="M 35 160 L 100 160 L 100 200 L 0 200 L 0 160 Z" fill="#240544" opacity="0.6" />
    <path d="M 100 50 L 200 50 L 200 200 L 100 200 Z" fill="#4C1D95" opacity="0.9" />
  </svg>
);

const TileSvg2 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg2-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2A0548" />
        <stop offset="100%" stopColor="#1C0330" />
      </linearGradient>
      <linearGradient id="svg2-loop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="35%" stopColor="#F97316" />
        <stop offset="70%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg2-bg)" />
    <path
      d="M 45 35 C 45 155, 155 155, 155 35"
      stroke="url(#svg2-loop)"
      strokeWidth="38"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const TileSvg3 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg3-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#240542" />
        <stop offset="100%" stopColor="#18032D" />
      </linearGradient>
      <linearGradient id="svg3-ribbon" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#EC4899" />
        <stop offset="50%" stopColor="#F43F5E" />
        <stop offset="100%" stopColor="#FB7185" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg3-bg)" />
    <path
      d="M 15 150 C 45 65, 105 65, 140 135 C 160 175, 185 165, 195 150"
      stroke="url(#svg3-ribbon)"
      strokeWidth="34"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const TileSvg4 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg4-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#250544" />
        <stop offset="100%" stopColor="#3D0B6B" />
      </linearGradient>
      <linearGradient id="svg4-pink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF2A85" />
        <stop offset="70%" stopColor="#F43F5E" />
        <stop offset="100%" stopColor="#BE123C" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg4-bg)" />
    <path d="M 0 0 L 130 0 L 130 60 L 80 60 L 80 140 L 0 140 Z" fill="url(#svg4-pink)" />
    <path d="M 80 60 L 200 60 L 200 200 L 80 200 Z" fill="#581C87" opacity="0.85" />
  </svg>
);

const TileSvg5 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg5-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1E0538" />
        <stop offset="100%" stopColor="#130225" />
      </linearGradient>
      <linearGradient id="svg5-fire" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF1838" />
        <stop offset="50%" stopColor="#EA580C" />
        <stop offset="100%" stopColor="#991B1B" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg5-bg)" />
    <path d="M 0 30 L 175 30 L 200 150 L 0 200 Z" fill="url(#svg5-fire)" />
  </svg>
);

const TileSvg6 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg6-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2A084E" />
        <stop offset="100%" stopColor="#1C0535" />
      </linearGradient>
      <linearGradient id="svg6-sun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF4B72" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
      <linearGradient id="svg6-wave" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#581C87" />
        <stop offset="100%" stopColor="#3B0764" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg6-bg)" />
    <circle cx="105" cy="85" r="54" fill="url(#svg6-sun)" />
    <path d="M 0 135 Q 100 100, 200 140 L 200 200 L 0 200 Z" fill="url(#svg6-wave)" />
  </svg>
);

const TileSvg7 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg7-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#320757" />
        <stop offset="100%" stopColor="#200438" />
      </linearGradient>
      <linearGradient id="svg7-loop" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="35%" stopColor="#F97316" />
        <stop offset="70%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg7-bg)" />
    <path
      d="M 45 165 C 45 45, 155 45, 155 165"
      stroke="url(#svg7-loop)"
      strokeWidth="38"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const TileSvg8 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg8-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#250542" />
        <stop offset="100%" stopColor="#1B0330" />
      </linearGradient>
      <linearGradient id="svg8-loop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="35%" stopColor="#F97316" />
        <stop offset="70%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg8-bg)" />
    <path
      d="M 45 45 C 45 155, 155 155, 155 45"
      stroke="url(#svg8-loop)"
      strokeWidth="38"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const TileSvg9 = () => (
  <svg viewBox="0 0 200 200" className={styles.tileSvg} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="svg9-bg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#2D0754" />
        <stop offset="100%" stopColor="#1B0433" />
      </linearGradient>
      <linearGradient id="svg9-pink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F43F5E" />
        <stop offset="50%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#C026D3" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#svg9-bg)" />
    <path d="M 0 35 L 200 120 L 200 200 L 0 200 Z" fill="url(#svg9-pink)" />
  </svg>
);

export default function TileReveal({
  headline = (
    <>
      Built for what
      <br />
      comes next
    </>
  ),
  subtitle = 'A grid that assembles on scroll, then steps aside to make room for your headline.',
  buttonText,
  onButtonClick,
  scrollContainerRef,
  className = '',
  style
}: TileRevealProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rawProgress = useMotionValue(0);

  // Synchronize scroll progression across either the modal container or window
  useEffect(() => {
    const getScrollContainer = (): HTMLElement | Window => {
      if (scrollContainerRef?.current) return scrollContainerRef.current;
      if (trackRef.current) {
        const found = trackRef.current.closest('[data-scroll-container]') as HTMLElement;
        if (found) return found;
      }
      return window;
    };

    const container = getScrollContainer();

    const handleScroll = () => {
      const track = trackRef.current;
      if (!track) return;

      if (container === window) {
        const rect = track.getBoundingClientRect();
        const totalDist = track.offsetHeight - window.innerHeight;
        if (totalDist > 0) {
          const p = Math.min(Math.max(-rect.top / totalDist, 0), 1);
          rawProgress.set(p);
        }
      } else {
        const el = container as HTMLElement;
        const scrollTop = el.scrollTop;
        const trackTop = track.offsetTop;
        const totalDist = track.offsetHeight - el.clientHeight;
        if (totalDist > 0) {
          const p = Math.min(Math.max((scrollTop - trackTop) / totalDist, 0), 1);
          rawProgress.set(p);
        }
      }
    };

    handleScroll();

    const targetToListen = container === window ? window : container;
    targetToListen.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      targetToListen.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [scrollContainerRef, rawProgress]);

  // Buttery-smooth Apple spring interpolation with fluid inertia
  const smoothProgress = useSpring(rawProgress, {
    stiffness: 55,
    damping: 18,
    mass: 0.5,
    restDelta: 0.0001
  });

  // 1. Initial "SCROLL |" Indicator
  const scrollIndicatorOpacity = useTransform(smoothProgress, [0.0, 0.08], [1, 0]);

  // 2. STAGE 1 TILES (Top-Center, Top-Right, Bottom-Center fly in early)
  const earlyTilesOpacity = useTransform(smoothProgress, [0.04, 0.22, 0.54, 0.72], [0, 1, 1, 0]);
  const earlyTileTopY = useTransform(smoothProgress, [0.04, 0.22, 0.54, 0.76], [-160, 0, 0, -200]);
  const earlyTileRightX = useTransform(smoothProgress, [0.04, 0.22, 0.54, 0.76], [160, 0, 0, 200]);
  const earlyTileBottomY = useTransform(smoothProgress, [0.04, 0.22, 0.54, 0.76], [160, 0, 0, 200]);

  // 3. STAGE 2 TILES (Remaining 6 tiles assemble into 3x3 grid, holding stably for appreciation)
  const fullGridOpacity = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.72], [0, 1, 1, 0]);
  const tlX = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [-160, 0, 0, -200]);
  const tlY = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [-160, 0, 0, -200]);
  const mlX = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [-180, 0, 0, -220]);
  const mcScale = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [0.6, 1, 1, 1.25]);
  const mrX = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [180, 0, 0, 220]);
  const blX = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [-160, 0, 0, -200]);
  const blY = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [160, 0, 0, 200]);
  const brX = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [180, 0, 0, 220]);
  const brY = useTransform(smoothProgress, [0.14, 0.30, 0.54, 0.76], [160, 0, 0, 200]);

  // 4. STAGE 4: FINAL REVEAL (Tiles dissolve, subtitle & content appear with smooth ease)
  const finalContentOpacity = useTransform(smoothProgress, [0.68, 0.86], [0, 1]);
  const finalContentY = useTransform(smoothProgress, [0.68, 0.86], [28, 0]);

  const handleIndicatorClick = () => {
    const el = scrollContainerRef?.current || trackRef.current?.closest('[data-scroll-container]') || window;
    if (el === window) {
      window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
    } else {
      (el as HTMLElement).scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
    }
  };

  return (
    <div ref={trackRef} className={`${styles.track} ${className}`} style={style}>
      <div className={styles.stickyStage}>
        {/* 3x3 Grid of 9 Graphic Tiles */}
        <div className={styles.tilesGrid} aria-hidden="true">
          {/* Row 1, Col 1: Top-Left (Stage 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ x: tlX, y: tlY, opacity: fullGridOpacity }}
          >
            <TileSvg1 />
          </motion.div>

          {/* Row 1, Col 2: Top-Center (Stage 1 early tile, Screenshot 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ y: earlyTileTopY, opacity: earlyTilesOpacity }}
          >
            <TileSvg2 />
          </motion.div>

          {/* Row 1, Col 3: Top-Right (Stage 1 early tile, Screenshot 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ x: earlyTileRightX, opacity: earlyTilesOpacity }}
          >
            <TileSvg3 />
          </motion.div>

          {/* Row 2, Col 1: Middle-Left (Stage 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ x: mlX, opacity: fullGridOpacity }}
          >
            <TileSvg4 />
          </motion.div>

          {/* Row 2, Col 2: Middle-Center (Stage 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ scale: mcScale, opacity: fullGridOpacity }}
          >
            <TileSvg5 />
          </motion.div>

          {/* Row 2, Col 3: Middle-Right (Stage 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ x: mrX, opacity: fullGridOpacity }}
          >
            <TileSvg6 />
          </motion.div>

          {/* Row 3, Col 1: Bottom-Left (Stage 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ x: blX, y: blY, opacity: fullGridOpacity }}
          >
            <TileSvg7 />
          </motion.div>

          {/* Row 3, Col 2: Bottom-Center (Stage 1 early tile, Screenshot 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ y: earlyTileBottomY, opacity: earlyTilesOpacity }}
          >
            <TileSvg8 />
          </motion.div>

          {/* Row 3, Col 3: Bottom-Right (Stage 2) */}
          <motion.div
            className={styles.tileCard}
            style={{ x: brX, y: brY, opacity: fullGridOpacity }}
          >
            <TileSvg9 />
          </motion.div>
        </div>

        {/* Central Bold Headline Overlay */}
        <div className={styles.headlineCenter}>
          <h1 className={styles.headline}>{headline}</h1>

          {/* Final Content Revealed when tiles step aside (Screenshot 4) */}
          <motion.div
            className={styles.finalContent}
            style={{ opacity: finalContentOpacity, y: finalContentY }}
          >
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            {buttonText && (
              <button
                type="button"
                onClick={onButtonClick}
                className={styles.primaryBtn}
                id="tile-reveal-action-btn"
              >
                <span>{buttonText}</span>
              </button>
            )}
          </motion.div>
        </div>

        {/* Initial Scroll Indicator (Screenshot 1) */}
        <motion.div
          className={styles.scrollIndicator}
          style={{ opacity: scrollIndicatorOpacity }}
          onClick={handleIndicatorClick}
          role="button"
          tabIndex={0}
          aria-label="Scroll to begin reveal"
        >
          <span className={styles.scrollText}>
            SCROLL <span className={styles.scrollChevron}>↓</span>
          </span>
          <div className={styles.scrollLine} />
        </motion.div>
      </div>
    </div>
  );
}
