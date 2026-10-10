'use client';

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  ElementType
} from 'react';
import { motion } from 'framer-motion';

export const easings = {
  linear: (e: number) => e,
  easeIn: (e: number) => e * e,
  easeOut: (e: number) => e * (2 - e),
  easeInOut: (e: number) => (e < 0.5 ? 2 * e * e : -1 + (4 - 2 * e) * e),
  elastic: (e: number) => {
    const t = (2 * Math.PI) / 3;
    return e === 0 ? 0 : e === 1 ? 1 : Math.pow(2, -10 * e) * Math.sin((10 * e - 0.75) * t) + 1;
  },
  bounce: (e: number) => {
    if (e < 1 / 2.75) return 7.5625 * e * e;
    if (e < 2 / 2.75) return 7.5625 * (e -= 1.5 / 2.75) * e + 0.75;
    if (e < 2.5 / 2.75) return 7.5625 * (e -= 2.25 / 2.75) * e + 0.9375;
    return 7.5625 * (e -= 2.625 / 2.75) * e + 0.984375;
  },
  anticipate: (e: number) => 2.70158 * e * e * e - 1.70158 * e * e
};

export interface StaggeredTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  segmentBy?: 'chars' | 'words' | 'lines';
  separator?: string;
  delay?: number;
  duration?: number;
  easing?: ((e: number) => number) | string | any;
  threshold?: number;
  rootMargin?: string;
  direction?: 'top' | 'bottom' | 'left' | 'right';
  blur?: boolean;
  from?: Record<string, any>;
  to?: Record<string, any> | Record<string, any>[];
  staggerDirection?: 'forward' | 'reverse' | 'center';
  respectReducedMotion?: boolean;
  exitOnScrollOut?: boolean;
  onAnimationComplete?: () => void;
  onExitComplete?: () => void;
}

export interface StaggeredTextRef {
  replay: () => void;
  exit: () => void;
}

const StaggeredText = forwardRef<StaggeredTextRef, StaggeredTextProps>(
  (
    {
      text,
      className = '',
      as: Component = 'p',
      segmentBy = 'words',
      separator,
      delay = 80,
      duration = 0.6,
      easing = (e: number) => e,
      threshold = 0.1,
      rootMargin = '0px',
      direction = 'top',
      blur = true,
      from,
      to,
      staggerDirection = 'forward',
      respectReducedMotion = true,
      exitOnScrollOut = false,
      onAnimationComplete,
      onExitComplete
    },
    ref
  ) => {
    const containerRef = useRef<HTMLElement>(null);
    const [isInView, setIsInView] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
      if (!respectReducedMotion || typeof window === 'undefined') return;
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }, [respectReducedMotion]);

    useImperativeHandle(ref, () => ({
      replay: () => {
        setIsExiting(false);
        setIsInView(false);
        requestAnimationFrame(() => {
          setIsInView(true);
        });
      },
      exit: () => {
        setIsExiting(true);
      }
    }));

    useEffect(() => {
      if (!containerRef.current || typeof window === 'undefined') return;
      const el = containerRef.current;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setIsExiting(false);
            if (!exitOnScrollOut && el) {
              observer.unobserve(el);
            }
          } else if (exitOnScrollOut && isInView) {
            setIsExiting(true);
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [threshold, rootMargin, exitOnScrollOut, isInView]);

    const defaultFrom = useMemo(() => {
      const f: Record<string, any> = { opacity: 0 };
      if (direction === 'top' || direction === 'bottom') {
        f.y = direction === 'top' ? -40 : 40;
      } else {
        f.x = direction === 'left' ? -40 : 40;
      }
      if (blur) f.filter = 'blur(10px)';
      return f;
    }, [direction, blur]);

    const defaultTo = useMemo(() => {
      const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
      return blur
        ? [
            {
              opacity: 0.7,
              [axis]: direction === 'top' || direction === 'left' ? 5 : -5,
              filter: 'blur(5px)'
            },
            {
              opacity: 1,
              [axis]: 0,
              filter: 'blur(0px)'
            }
          ]
        : [{ opacity: 1, [axis]: 0 }];
    }, [direction, blur]);

    const fromState = useMemo(() => from ?? defaultFrom, [from, defaultFrom]);
    const toState = useMemo(
      () => (to ? (Array.isArray(to) ? to : [to]) : defaultTo),
      [to, defaultTo]
    );

    const keyframesCount = toState.length + 1;
    const times = useMemo(
      () =>
        Array.from({ length: keyframesCount }, (_, i) =>
          keyframesCount === 1 ? 0 : i / (keyframesCount - 1)
        ),
      [keyframesCount]
    );

    const { rowsSegments, totalSegments } = useMemo(() => {
      if (!text) return { rowsSegments: [], totalSegments: 0 };
      const rawRows = (separator && separator.length > 0 ? text.split(separator) : text.split(/\r?\n/));
      const parsed = rawRows.map((line) => {
        switch (segmentBy) {
          case 'chars':
            return line.split('');
          case 'lines':
            return [line];
          default:
            return line.split(' ');
        }
      });
      const count = parsed.reduce((acc, row) => acc + row.length, 0);
      return { rowsSegments: parsed, totalSegments: count };
    }, [text, segmentBy, separator]);

    if (!text) return null;

    const propertyKeys = new Set([
      ...Object.keys(fromState),
      ...toState.flatMap((item) => Object.keys(item))
    ]);
    const targetKeyframes: Record<string, any[]> = {};
    propertyKeys.forEach((key) => {
      targetKeyframes[key] = [fromState[key], ...toState.map((t) => t[key])];
    });

    let segmentCounter = 0;
    const isMultiLine = rowsSegments.length > 1;

    // Resolve easing function or preset
    const resolvedEase = typeof easing === 'string' && (easings as any)[easing]
      ? (easings as any)[easing]
      : easing;

    return (
      <Component
        ref={containerRef as any}
        className={`staggered-text ${className}`}
        style={{
          display: Component === 'span' || Component === 'a' ? (isMultiLine ? 'block' : 'inline') : 'block',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          wordBreak: 'normal',
          overflowWrap: 'break-word'
        }}
      >
        {rowsSegments.map((row, rowIdx) => (
          <React.Fragment key={`row-${rowIdx}`}>
            {row.map((segment, segIdx) => {
              const currentIndex = segmentCounter++;
              const isLast = currentIndex === totalSegments - 1;

              const getDelay = () => {
                if (reducedMotion) return 0;
                switch (staggerDirection) {
                  case 'reverse':
                    return ((totalSegments - 1 - currentIndex) * delay) / 1000;
                  case 'center':
                    return (Math.abs(currentIndex - (totalSegments - 1) / 2) * delay) / 1000;
                  default:
                    return (currentIndex * delay) / 1000;
                }
              };

              const transition = reducedMotion
                ? { duration: 0.01, delay: 0 }
                : {
                    duration,
                    times,
                    delay: getDelay(),
                    ease: resolvedEase
                  };

              return (
                <motion.span
                  key={`seg-${rowIdx}-${segIdx}`}
                  initial={fromState}
                  animate={isExiting ? fromState : isInView ? targetKeyframes : fromState}
                  transition={transition}
                  onAnimationComplete={
                    isLast
                      ? () => {
                          if (isExiting) {
                            onExitComplete?.();
                          } else {
                            onAnimationComplete?.();
                          }
                        }
                      : undefined
                  }
                  style={{
                    display: segmentBy === 'lines' ? 'block' : 'inline-block',
                    willChange: 'transform, filter, opacity',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    marginRight: segmentBy === 'words' && segIdx < row.length - 1 ? '0.25em' : undefined
                  }}
                >
                  {segmentBy === 'chars' && segment === ' ' ? '\u00A0' : segment}
                </motion.span>
              );
            })}
            {rowIdx < rowsSegments.length - 1 && segmentBy !== 'lines' && (
              <br key={`br-${rowIdx}`} />
            )}
          </React.Fragment>
        ))}
      </Component>
    );
  }
);

StaggeredText.displayName = 'StaggeredText';

export default StaggeredText;
