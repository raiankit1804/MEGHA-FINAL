'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  ElementType
} from 'react';

export interface VaporTypeProps {
  words?: string[];
  as?: ElementType;
  align?: 'start' | 'center' | 'end';
  color?: string;
  vaporColor?: string;
  density?: number;
  particleSize?: number;
  spread?: number;
  rise?: number;
  turbulence?: number;
  diffusion?: number;
  grain?: number;
  sweep?: 'left' | 'right' | 'center' | 'top' | 'scatter';
  stagger?: number;
  condense?: number;
  hold?: number;
  dissolve?: number;
  overlap?: number;
  loop?: boolean;
  startOnView?: boolean;
  interactive?: boolean;
  breath?: number;
  breathRadius?: number;
  recovery?: number;
  clickAdvance?: boolean;
  pauseOnHover?: boolean;
  area?: 'parent' | 'self' | 'window';
  paused?: boolean;
  dpr?: number;
  onWordChange?: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface VaporTypeRef {
  next: () => void;
  replay: () => void;
}

interface Particle {
  tx: number; // target x
  ty: number; // target y
  vx: number; // vapor start/end offset x
  vy: number; // vapor start/end offset y
  staggerDelay: number; // normalized stagger time [0, 1]
  size: number;
  noiseSeed: number;
  // Interactive push offset
  ix: number;
  iy: number;
}

interface WordGeometry {
  width: number;
  height: number;
  particles: Particle[];
}

export const VaporType = forwardRef<VaporTypeRef, VaporTypeProps>(function VaporType(
  {
    words = ['Imagine', 'Create', 'Inspire'],
    as: Component = 'span',
    align = 'center',
    color = 'currentColor',
    vaporColor = '#38bdf8',
    density = 1,
    particleSize = 1.3,
    spread = 1.2,
    rise = 1.0,
    turbulence = 0.8,
    diffusion = 0.35,
    grain = 1,
    sweep = 'left',
    stagger = 0.8,
    condense = 1.8,
    hold = 2.4,
    dissolve = 2.0,
    overlap = 0.6,
    loop = true,
    startOnView = true,
    interactive = true,
    breath = 1.0,
    breathRadius = 0.8,
    recovery = 1.2,
    clickAdvance = true,
    pauseOnHover = true,
    area = 'parent',
    paused = false,
    dpr = 2,
    onWordChange,
    className = '',
    style
  },
  ref
) {
  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Animation timeline state
  const wordIndexRef = useRef(0);
  wordIndexRef.current = currentWordIndex;

  const animStateRef = useRef<{
    phase: 'condense' | 'hold' | 'dissolve';
    progress: number; // 0 to 1 in phase
    startTime: number;
    mouse: { x: number; y: number; px: number; py: number; active: boolean };
    paused: boolean;
  }>({
    phase: 'condense',
    progress: 0,
    startTime: 0,
    mouse: { x: -9999, y: -9999, px: -9999, py: -9999, active: false },
    paused: false
  });

  const parsedGeometriesRef = useRef<Map<string, WordGeometry>>(new Map());
  const maxDimensionsRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Resolve color strings
  const resolveColor = useCallback((col: string, fallback: string) => {
    if (!col || col === 'currentColor') return fallback;
    return col;
  }, []);

  // Intersection observer for startOnView
  useEffect(() => {
    if (!startOnView) {
      setIsVisible(true);
      return;
    }
    const elem = containerRef.current;
    if (!elem) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(elem);
    return () => observer.disconnect();
  }, [startOnView]);

  // Imperative ref methods
  useImperativeHandle(ref, () => ({
    next: () => {
      advanceWord();
    },
    replay: () => {
      setCurrentWordIndex(0);
      animStateRef.current.phase = 'condense';
      animStateRef.current.progress = 0;
      animStateRef.current.startTime = performance.now();
      onWordChange?.(0);
    }
  }));

  const advanceWord = useCallback(() => {
    const nextIdx = (wordIndexRef.current + 1) % words.length;
    if (!loop && wordIndexRef.current === words.length - 1) {
      return;
    }
    setCurrentWordIndex(nextIdx);
    animStateRef.current.phase = 'condense';
    animStateRef.current.progress = 0;
    animStateRef.current.startTime = performance.now();
    onWordChange?.(nextIdx);
  }, [words.length, loop, onWordChange]);

  // Sample word geometry from offscreen canvas
  const sampleWord = useCallback(
    (
      word: string,
      fontSize: number,
      fontFamily: string,
      fontWeight: string
    ): WordGeometry => {
      const cached = parsedGeometriesRef.current.get(`${word}-${fontSize}-${fontWeight}`);
      if (cached) return cached;

      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return { width: 100, height: 40, particles: [] };

      const fontStr = `${fontWeight} ${fontSize}px ${fontFamily}`;
      offCtx.font = fontStr;
      const metrics = offCtx.measureText(word);

      const actualHeight = Math.ceil(
        (metrics.actualBoundingBoxAscent || fontSize * 0.8) +
          (metrics.actualBoundingBoxDescent || fontSize * 0.2)
      );
      const actualWidth = Math.ceil(metrics.width) || 100;
      const pad = Math.ceil(fontSize * 0.3);

      offCanvas.width = actualWidth + pad * 2;
      offCanvas.height = actualHeight + pad * 2;

      offCtx.font = fontStr;
      offCtx.textBaseline = 'top';
      offCtx.fillStyle = '#ffffff';
      offCtx.fillText(word, pad, pad);

      const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      const data = imgData.data;
      const particles: Particle[] = [];

      // Sampling step based on density
      const step = Math.max(1, Math.round(2 / Math.sqrt(Math.max(0.2, density))));

      for (let y = 0; y < offCanvas.height; y += step) {
        for (let x = 0; x < offCanvas.width; x += step) {
          const idx = (y * offCanvas.width + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 48) {
            // Normalized position for sweeps
            let staggerVal = 0;
            const normX = x / offCanvas.width;
            const normY = y / offCanvas.height;

            if (sweep === 'left') staggerVal = normX;
            else if (sweep === 'right') staggerVal = 1 - normX;
            else if (sweep === 'top') staggerVal = normY;
            else if (sweep === 'center') staggerVal = Math.abs(normX - 0.5) * 2;
            else staggerVal = Math.random();

            // Random vapor drift vectors
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.random() * 0.5 + 0.5) * fontSize * spread;
            const vx = Math.cos(angle) * dist * (1 + (Math.random() - 0.5) * diffusion);
            const vy = -Math.abs(Math.sin(angle)) * dist * rise * 1.5;

            particles.push({
              tx: x - pad,
              ty: y - pad,
              vx,
              vy,
              staggerDelay: staggerVal,
              size: particleSize * (0.8 + Math.random() * 0.4),
              noiseSeed: Math.random() * 1000,
              ix: 0,
              iy: 0
            });
          }
        }
      }

      const geom: WordGeometry = {
        width: actualWidth,
        height: actualHeight,
        particles
      };
      parsedGeometriesRef.current.set(`${word}-${fontSize}-${fontWeight}`, geom);
      return geom;
    },
    [density, particleSize, spread, rise, sweep, diffusion]
  );

  // Measure all words and build canvas size
  const updateMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const computed = window.getComputedStyle(container);
    const fontSize = parseFloat(computed.fontSize) || 32;
    const fontFamily = computed.fontFamily || 'sans-serif';
    const fontWeight = computed.fontWeight || '600';

    let maxWidth = 0;
    let maxHeight = 0;

    words.forEach((w) => {
      const g = sampleWord(w, fontSize, fontFamily, fontWeight);
      if (g.width > maxWidth) maxWidth = g.width;
      if (g.height > maxHeight) maxHeight = g.height;
    });

    maxDimensionsRef.current = {
      width: Math.ceil(maxWidth + fontSize * spread * 1.5),
      height: Math.ceil(maxHeight + fontSize * Math.max(1, rise) * 1.5)
    };

    const canvas = canvasRef.current;
    if (canvas) {
      const actualDpr = Math.min(dpr, window.devicePixelRatio || 2);
      const w = maxDimensionsRef.current.width;
      const h = maxDimensionsRef.current.height;
      canvas.width = Math.max(1, w * actualDpr);
      canvas.height = Math.max(1, h * actualDpr);
      canvas.style.width = `${w}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      canvas.style.boxSizing = 'border-box';
    }
  }, [words, sampleWord, spread, rise, dpr]);

  // Pointer interaction listeners
  useEffect(() => {
    if (!interactive) return;

    const target =
      area === 'window'
        ? window
        : area === 'parent'
        ? containerRef.current?.parentElement || containerRef.current
        : containerRef.current;

    if (!target) return;

    const onPointerMove = (e: Event) => {
      const pe = e as MouseEvent;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = pe.clientX - rect.left;
      const my = pe.clientY - rect.top;

      animStateRef.current.mouse = {
        x: mx,
        y: my,
        px: animStateRef.current.mouse.x,
        py: animStateRef.current.mouse.y,
        active: true
      };
    };

    const onPointerLeave = () => {
      animStateRef.current.mouse.active = false;
      setIsHovered(false);
    };

    const onPointerEnter = () => {
      setIsHovered(true);
    };

    target.addEventListener('mousemove', onPointerMove as EventListener);
    target.addEventListener('mouseleave', onPointerLeave as EventListener);
    target.addEventListener('mouseenter', onPointerEnter as EventListener);

    return () => {
      target.removeEventListener('mousemove', onPointerMove as EventListener);
      target.removeEventListener('mouseleave', onPointerLeave as EventListener);
      target.removeEventListener('mouseenter', onPointerEnter as EventListener);
    };
  }, [interactive, area]);

  // Click advance listener
  const handleClick = useCallback(() => {
    if (!clickAdvance) return;
    advanceWord();
  }, [clickAdvance, advanceWord]);

  // Main animation frame loop
  useEffect(() => {
    if (!isVisible || words.length === 0) return;

    updateMetrics();

    let reqId: number;
    let lastTime = performance.now();
    animStateRef.current.startTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (canvas && ctx) {
        const actualDpr = Math.min(dpr, window.devicePixelRatio || 2);
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(actualDpr, actualDpr);

        const container = containerRef.current;
        const comp = container ? window.getComputedStyle(container) : null;
        const inheritedColor = comp?.color || '#ffffff';
        const primaryColor = resolveColor(color, inheritedColor);
        const resolvedVaporColor = resolveColor(vaporColor, '#38bdf8');
        const fontSize = comp ? parseFloat(comp.fontSize) || 32 : 32;

        // Current phase progression
        const state = animStateRef.current;
        const isPausedState = paused || (pauseOnHover && isHovered);

        if (!isPausedState) {
          const elapsed = (time - state.startTime) / 1000;

          if (state.phase === 'condense') {
            state.progress = Math.min(1, elapsed / Math.max(0.1, condense));
            if (state.progress >= 1) {
              state.phase = 'hold';
              state.progress = 0;
              state.startTime = time;
            }
          } else if (state.phase === 'hold') {
            state.progress = Math.min(1, elapsed / Math.max(0.1, hold));
            if (state.progress >= 1) {
              state.phase = 'dissolve';
              state.progress = 0;
              state.startTime = time;
            }
          } else if (state.phase === 'dissolve') {
            state.progress = Math.min(1, elapsed / Math.max(0.1, dissolve));
            if (state.progress >= 1) {
              advanceWord();
            }
          }
        }

        const currWord = words[wordIndexRef.current] || '';
        const fontWeight = comp?.fontWeight || '600';
        const geom = sampleWord(currWord, fontSize, comp?.fontFamily || 'sans-serif', fontWeight);

        // Alignment offset within max bounds
        let alignOffsetX = 0;
        const totalW = maxDimensionsRef.current.width;
        const totalH = maxDimensionsRef.current.height;
        const baseY = (totalH - geom.height) / 2 + fontSize * 0.3;

        if (align === 'center') {
          alignOffsetX = (totalW - geom.width) / 2;
        } else if (align === 'end') {
          alignOffsetX = totalW - geom.width - fontSize * 0.5;
        } else {
          alignOffsetX = fontSize * 0.5;
        }

        // Pointer breath interaction calculations
        const mouse = state.mouse;
        const breathDistPx = breathRadius * fontSize;

        // Render each particle with vapor dynamics
        const particles = geom.particles;
        const count = particles.length;

        for (let i = 0; i < count; i++) {
          const p = particles[i];

          // Staggered local progress
          const delay = p.staggerDelay * stagger;
          let localProg = 1;

          if (state.phase === 'condense') {
            const raw = (state.progress - delay * 0.4) / (1 - delay * 0.4 || 1);
            localProg = Math.max(0, Math.min(1, raw));
          } else if (state.phase === 'hold') {
            localProg = 1;
          } else if (state.phase === 'dissolve') {
            const raw = 1 - (state.progress - delay * 0.4) / (1 - delay * 0.4 || 1);
            localProg = Math.max(0, Math.min(1, raw));
          }

          // Ease curve
          const ease = 1 - Math.pow(1 - localProg, 3);

          // Vapor turbulence noise
          const tNoise = Math.sin(time * 0.002 * turbulence + p.noiseSeed) * fontSize * 0.15 * (1 - ease);
          const tNoiseY = Math.cos(time * 0.0015 * turbulence + p.noiseSeed) * fontSize * 0.15 * (1 - ease);

          // Interpolate between vapor source and target glyph position
          const currentTargetX = alignOffsetX + p.tx;
          const currentTargetY = baseY + p.ty;

          let posX = currentTargetX + (1 - ease) * p.vx + tNoise;
          let posY = currentTargetY + (1 - ease) * p.vy + tNoiseY;

          // Interactive mouse push
          if (mouse.active) {
            const dx = posX - mouse.x;
            const dy = posY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < breathDistPx && dist > 0) {
              const force = (1 - dist / breathDistPx) * breath * 18;
              p.ix += (dx / dist) * force;
              p.iy += (dy / dist) * force;
            }
          }

          // Dampen interactive push
          p.ix *= Math.max(0, 1 - (dt / Math.max(0.1, recovery)) * 2);
          p.iy *= Math.max(0, 1 - (dt / Math.max(0.1, recovery)) * 2);

          posX += p.ix;
          posY += p.iy;

          // Opacity & Color mixing
          const alpha = Math.max(0, Math.min(1, ease * 0.95 + (1 - ease) * 0.25));
          if (alpha <= 0.01) continue;

          ctx.fillStyle = ease > 0.85 ? primaryColor : resolvedVaporColor;
          ctx.globalAlpha = alpha;

          // Draw round particle
          ctx.beginPath();
          ctx.arc(posX, posY, p.size * (0.6 + ease * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(reqId);
  }, [
    isVisible,
    words,
    updateMetrics,
    sampleWord,
    align,
    color,
    vaporColor,
    condense,
    hold,
    dissolve,
    stagger,
    turbulence,
    breath,
    breathRadius,
    recovery,
    paused,
    pauseOnHover,
    isHovered,
    dpr,
    resolveColor,
    advanceWord
  ]);

  return (
    <Component
      ref={containerRef as any}
      className={`vapor-type-root ${className}`}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start',
        position: 'relative',
        cursor: clickAdvance ? 'pointer' : 'default',
        userSelect: 'none',
        lineHeight: 1.1,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style
      }}
      aria-label={words[currentWordIndex]}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          display: 'block',
          pointerEvents: 'none',
          maxWidth: '100%',
          height: 'auto',
          boxSizing: 'border-box'
        }}
      />
      {/* Visually hidden screen reader accessible label */}
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        {words[currentWordIndex]}
      </span>
    </Component>
  );
});

export default VaporType;
