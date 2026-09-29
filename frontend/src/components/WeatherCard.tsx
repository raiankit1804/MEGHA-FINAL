'use client';

/**
 * WeatherGPT v2.0 — Apple Weather-Style Frosted Glassmorphic WeatherCard
 * - Immersive dynamic atmospheric sky canvas (rain, storm, lightning, clouds, sun, snow)
 * - Multi-layer even vertical rain simulation with surface splash ripples & droplet bounces
 * - Authentic Apple Weather 2-column square widget grid:
 *     1. UV Index (gradient gauge bar with indicator dot)
 *     2. Sunset / Sunrise (dynamic sun trajectory arc with glowing sun disk)
 *     3. Wind (circular compass dial with cardinal points & needle)
 *     4. Feels Like (temperature comparison)
 *     5. Precipitation (in last 24h & expected 24h sum)
 *     6. Humidity (with accurate dew point calculation)
 *     7. Visibility (km view conditions)
 *     8. Pressure (radial arc gauge with Low/High markers)
 *     9. Air Quality / AQI (score, category & spectrum indicator)
 * - Huge hero typography (temperature, condition, feels like)
 * - Official IMD Warning watch banner
 * - Weather tomorrow banner
 * - Horizontal scrolling Hourly Forecast rail (next 24h)
 * - 6-Day Forecast strip with high/low temperatures
 * - Activities suitability index (Running, Jogging, Cycling, Hiking)
 * - Allergies index (Dust & dander, AQI status)
 * - Live Doppler Weather Radar map preview with one-tap launcher
 * - Expandable "More weather details" panel with interactive Recharts
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './WeatherCard.module.css';
import {
  WeatherData,
  IMDWarning,
  RiskItem,
  WeatherSource,
  DataFreshness,
  ModelAgreement,
  DailyForecastItem,
  AirQualityData,
  HourlyForecastItem,
  ActivitiesData,
  AllergiesData,
} from '../types/weather';
import {
  getCardTranslation,
  translateWarningHazard,
  translateWarningDesc,
  getWarningSourceText,
  translateLocation,
  translateSourceName,
} from '../i18n/translations';

const WEATHER_EMOJI: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  80: '🌦️',
  81: '🌧️',
  82: '🌧️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

const getWmoEmoji = (code?: number, day: boolean = true) => {
  if (code === undefined || code === null) return '🌡️';
  if (!day) {
    if (code === 0 || code === 1) return '🌙';
    if (code === 2) return '☁️';
  }
  return WEATHER_EMOJI[code] || '🌡️';
};

// Accurate lunar crescent / gibbous SVG path for Apple Weather Moon widget
function getMoonPath(moonAge: number, cx: number, cy: number, r: number): string {
  const phi = (moonAge / 29.53058867) * 2 * Math.PI;
  const isWaxing = moonAge <= 14.765;
  const rx = Math.max(0.5, Math.abs(r * Math.cos(phi)));
  const sweepTerminator = Math.cos(phi) >= 0 ? 0 : 1;

  if (isWaxing) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweepTerminator} ${cx} ${cy - r} Z`;
  } else {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${1 - sweepTerminator} ${cx} ${cy - r} Z`;
  }
}

const WIND_DIRS_INDIC: Record<string, Record<string, string>> = {
  hi: {
    N: 'उ', NNE: 'उ-उ-पू', NE: 'ईशान', ENE: 'पू-उ-पू',
    E: 'पू', ESE: 'पू-द-पू', SE: 'आग्नेय', SSE: 'द-द-पू',
    S: 'द', SSW: 'द-द-प', SW: 'नैऋत्य', WSW: 'प-द-प',
    W: 'प', WNW: 'प-उ-प', NW: 'वायव्य', NNW: 'उ-उ-प',
  },
  bn: {
    N: 'উ', NNE: 'উ-উ-পূ', NE: 'উত্তর-পূর্ব', ENE: 'পূ-উ-পূ',
    E: 'পূ', ESE: 'পূ-দ-পূ', SE: 'দক্ষিণ-পূর্ব', SSE: 'দ-দ-পূ',
    S: 'দ', SSW: 'দ-দ-প', SW: 'দক্ষিণ-পশ্চিম', WSW: 'প-দ-প',
    W: 'প', WNW: 'প-উ-প', NW: 'উ-প', NNW: 'উ-উ-প',
  },
  te: {
    N: 'ఉ', NNE: 'ఉ-ఉ-తూ', NE: 'ఈశాన్యం', ENE: 'తూ-ఉ-తూ',
    E: 'తూ', ESE: 'తూ-ద-తూ', SE: 'ఆగ్నేయం', SSE: 'ద-ద-తూ',
    S: 'ద', SSW: 'ద-ద-ప', SW: 'నైరుతి', WSW: 'ప-నై',
    W: 'ప', WNW: 'ప-వా', NW: 'వాయవ్యం', NNW: 'ఉ-వా',
  },
  ta: {
    N: 'வ', NNE: 'வ-வ-கி', NE: 'வ-கி', ENE: 'கி-வ-கி',
    E: 'கி', ESE: 'கி-தெ-கி', SE: 'தெ-கி', SSE: 'தெ-தெ-கி',
    S: 'தெ', SSW: 'தெ-தெ-மே', SW: 'தெ-மே', WSW: 'மே-தெ-மே',
    W: 'மே', WNW: 'மே-வ-மே', NW: 'வ-மே', NNW: 'வ-வ-மே',
  },
  mr: {
    N: 'उ', NNE: 'उ-उ-पू', NE: 'उ-पू', ENE: 'पू-उ-पू',
    E: 'पू', ESE: 'पू-द-पू', SE: 'द-पू', SSE: 'द-द-पू',
    S: 'द', SSW: 'द-द-प', SW: 'द-प', WSW: 'प-द-प',
    W: 'प', WNW: 'प-उ-प', NW: 'उ-प', NNW: 'उ-उ-प',
  },
  gu: {
    N: 'ઉ', NNE: 'ઉ-ઉ-પૂ', NE: 'ઈશાન', ENE: 'પૂ-ઉ-પૂ',
    E: 'પૂ', ESE: 'પૂ-દ-પૂ', SE: 'અગ્નિ', SSE: 'દ-દ-પૂ',
    S: 'દ', SSW: 'દ-દ-પ', SW: 'નૈઋત્ય', WSW: 'પ-દ-પ',
    W: 'પ', WNW: 'પ-ઉ-પ', NW: 'વાયવ્ય', NNW: 'ઉ-ઉ-પ',
  },
};

function getWindDirection(deg?: number, lang: string = 'en'): string {
  if (deg === undefined || deg === null) return '';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  const rawDir = dirs[idx];
  if (!lang || lang === 'en') return rawDir;
  return WIND_DIRS_INDIC[lang]?.[rawDir] || rawDir;
}

function formatSunTime(raw?: string, fallback: string = '5:58 PM'): string {
  if (!raw) return fallback;
  if (raw.includes('T')) {
    try {
      const d = new Date(raw);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return fallback;
    }
  }
  return raw;
}

function parseTimeToMinutes(raw?: string, fallbackMin: number = 360): number {
  if (!raw) return fallbackMin;
  if (raw.includes('T')) {
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes();
    } catch {}
  }
  const match = raw.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    let hr = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hr < 12) hr += 12;
    if (ampm === 'AM' && hr === 12) hr = 0;
    return hr * 60 + min;
  }
  return fallbackMin;
}

export interface WeatherCardProps {
  weather?: WeatherData | null;
  warnings?: IMDWarning[];
  risks?: RiskItem[];
  location?: string;
  language?: string;
  dataFreshness?: DataFreshness;
  modelAgreement?: ModelAgreement;
  sources?: WeatherSource[];
  requiresChart?: boolean;
  onOpenSatellite?: (mode?: string) => void;
  onRefresh?: () => void;
  onDownloadPdf?: () => void;
}

export default function WeatherCard({
  weather,
  warnings = [],
  risks = [],
  location,
  language = 'en',
  dataFreshness = 'live',
  modelAgreement = 'not_applicable',
  sources = [],
  requiresChart = false,
  onOpenSatellite,
  onRefresh,
  onDownloadPdf,
}: WeatherCardProps) {
  const [showDetails, setShowDetails] = useState<boolean>(requiresChart);

  if (!weather) return null;

  const current = weather.current_weather || {};
  const daily = weather.daily_forecast || [];
  const hourly = weather.hourly_forecast || [];
  const aqi = weather.air_quality;
  const activities = weather.activities || {};
  const allergies = weather.allergies;
  const tomorrowSummary = weather.tomorrow_summary;

  const isDay = current.is_day !== undefined ? current.is_day === 1 : (() => {
    const hr = new Date().getHours();
    return hr >= 6 && hr < 18;
  })();

  const wmoEmoji = (current.weather_code !== undefined ? getWmoEmoji(current.weather_code, isDay) : null) || current.emoji || '🌡️';

  // Compute daily min and max from today
  const todayForecast = daily[0];
  const tempMin = todayForecast?.temp_min !== undefined ? Math.round(todayForecast.temp_min) : Math.round(current.temperature ?? 20);
  const tempMax = todayForecast?.temp_max !== undefined ? Math.round(todayForecast.temp_max) : Math.round((current.temperature ?? 25) + 6);
  const currentTemp = current.temperature !== undefined ? Math.round(current.temperature) : '—';
  const currentTempNum = typeof current.temperature === 'number' ? current.temperature : 26;
  const feelsLike = current.feels_like !== undefined ? Math.round(current.feels_like) : currentTemp;
  const feelsLikeNum = current.feels_like !== undefined ? Math.round(current.feels_like) : currentTempNum;

  // Wind direction & speed
  const windDeg = current.wind_direction ?? 84;
  const windDirStr = getWindDirection(windDeg, language);
  const windSpeed = current.wind_speed !== undefined ? Math.round(current.wind_speed) : 23;
  const windGusts = todayForecast?.wind_gusts !== undefined ? Math.round(todayForecast.wind_gusts) : Math.round(windSpeed * 1.6);

  // Pressure in mb (hPa) - standard barometric reading uses Mean Sea Level pressure
  let rawPressure = current.pressure_msl ?? current.surface_pressure ?? 1013.25;
  // If raw station altitude pressure was returned (< 960 hPa at normal elevations like Bengaluru ~920m)
  if (rawPressure < 960 && (!current.weather_code || current.weather_code < 95)) {
    rawPressure += 100.0;
  }
  const pressureNum = rawPressure;
  const pressureVal = `${pressureNum.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${getCardTranslation(language, 'mb', 'hPa')}`;
  const pressureAngle = Math.max(-55, Math.min(55, (pressureNum - 1000) * 1.8));

  // Precipitation in mm
  const precipVal = `${(current.precipitation ?? 0).toFixed(1)} ${getCardTranslation(language, 'mm', 'mm')}`;

  // Humidity & Dew Point calculation
  const humidityVal = current.humidity ?? 78;
  const dewPointVal = Math.round(currentTempNum - ((100 - humidityVal) / 5));

  // Visibility in km
  const visMeters = current.visibility;
  const visKm = visMeters !== undefined
    ? (visMeters >= 1000 ? (visMeters / 1000).toFixed(0) : visMeters.toFixed(0))
    : '5';

  // UV Index
  const uvScore = current.uv_index !== undefined ? current.uv_index : 2;
  const uvCategory = uvScore <= 2 ? 'Low' : uvScore <= 5 ? 'Moderate' : uvScore <= 7 ? 'High' : uvScore <= 10 ? 'Very High' : 'Extreme';

  // Sunrise / Sunset & Sun Trajectory
  const sunsetStr = formatSunTime(todayForecast?.sunset, '6:13 PM');
  const sunriseStr = formatSunTime(todayForecast?.sunrise, '6:08 AM');

  // Sun Progress for 24h Sun Arc
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const srMin = parseTimeToMinutes(todayForecast?.sunrise, 368); // ~6:08 AM
  const ssMin = parseTimeToMinutes(todayForecast?.sunset, 1093); // ~6:13 PM
  const isDayTime = currentMins >= srMin && currentMins < ssMin;
  const isSunsetPassed = !isDayTime;

  let sunX = 80;
  let sunY = 24;
  if (isDayTime) {
    // Daytime: rides daylight arc from left sunrise (10, 24) to right sunset (150, 24)
    const dayProgress = Math.max(0.04, Math.min(0.96, (currentMins - srMin) / Math.max(1, ssMin - srMin)));
    const t = dayProgress;
    sunX = Math.round((1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 80 + t * t * 150);
    sunY = Math.round((1 - t) * (1 - t) * 24 + 2 * (1 - t) * t * 5 + t * t * 24);
  } else {
    // Nighttime: rides night arc below horizon from sunset on right (150, 24) toward upcoming sunrise on left (10, 24)
    const totalNight = (1440 - ssMin) + srMin;
    const elapsedNight = currentMins >= ssMin ? (currentMins - ssMin) : (1440 - ssMin + currentMins);
    const nightProgress = Math.max(0.04, Math.min(0.96, elapsedNight / Math.max(1, totalNight)));
    const t = nightProgress;
    sunX = Math.round((1 - t) * (1 - t) * 150 + 2 * (1 - t) * t * 80 + t * t * 10);
    sunY = Math.round((1 - t) * (1 - t) * 24 + 2 * (1 - t) * t * 42 + t * t * 24);
  }

  // Moon calculations for Apple Weather-style Moon widget
  const moonData = useMemo(() => {
    const ref = new Date(Date.UTC(2024, 0, 11, 11, 57, 0)).getTime();
    const diffDays = (now.getTime() - ref) / 86400000;
    const cycle = 29.53058867;
    const age = ((diffDays % cycle) + cycle) % cycle;
    const normalized = age / cycle;
    const illumination = Math.round(((1 - Math.cos(normalized * 2 * Math.PI)) / 2) * 100);
    let daysToFull = Math.round(14.765 - age);
    if (daysToFull < 0) daysToFull += Math.round(cycle);

    const isFullMoonNow = daysToFull === 0 || illumination >= 98;
    const displayDaysToFull = isFullMoonNow ? 29 : daysToFull;

    let phaseName = 'New Moon';
    let phaseKey = 'newMoon';
    if (age < 1.84) {
      phaseName = 'New Moon';
      phaseKey = 'newMoon';
    } else if (age < 5.53) {
      phaseName = 'Waxing Crescent';
      phaseKey = 'waxingCrescent';
    } else if (age < 9.22) {
      phaseName = 'First Quarter';
      phaseKey = 'firstQuarter';
    } else if (age < 12.91) {
      phaseName = 'Waxing Gibbous';
      phaseKey = 'waxingGibbous';
    } else if (age < 16.61) {
      phaseName = 'Full Moon';
      phaseKey = 'fullMoon';
    } else if (age < 20.30) {
      phaseName = 'Waning Gibbous';
      phaseKey = 'waningGibbous';
    } else if (age < 23.99) {
      phaseName = 'Last Quarter';
      phaseKey = 'lastQuarter';
    } else if (age < 27.68) {
      phaseName = 'Waning Crescent';
      phaseKey = 'waningCrescent';
    } else {
      phaseName = 'New Moon';
      phaseKey = 'newMoon';
    }
    return {
      phaseName,
      phaseKey,
      illumination,
      daysToFullMoon: daysToFull,
      displayDaysToFull,
      isFullMoonNow,
      age,
    };
  }, []);

  // AQI score and label
  const aqiScore = aqi?.us_aqi ?? 28;
  const aqiCategory = aqi?.category || (aqiScore <= 50 ? 'Good' : aqiScore <= 100 ? 'Moderate' : 'Poor');
  const aqiColor = aqiScore <= 50 ? '#22c55e' : aqiScore <= 100 ? '#f59e0b' : '#ef4444';

  // Primary IMD warning
  const primaryWarning = warnings.length > 0 ? warnings[0] : null;

  const translatedCondition = getCardTranslation(language, current.condition || 'Clear sky', current.condition || 'Clear sky');

  // ─── Apple Weather-Style Atmospheric Animation Engine ───────────────────────
  // ─── Hourly Rail Scroll Controllers ──────────────────────────────────────────
  const hourlyRailRef = useRef<HTMLDivElement | null>(null);

  const scrollHourly = (offset: number) => {
    if (hourlyRailRef.current) {
      hourlyRailRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Smooth wheel horizontal scrolling without triggering page scroll
  useEffect(() => {
    const el = hourlyRailRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.25;
      } else if (Math.abs(e.deltaX) > 0) {
        el.scrollLeft += e.deltaX;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Desktop mouse drag-to-scroll
  useEffect(() => {
    const el = hourlyRailRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.clientX;
      scrollStart = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      el.scrollLeft = scrollStart - dx;
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = 'grab';
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  /** Derive animation type from WMO weather_code or condition string */
  const getAnimationType = useCallback((): 'rain' | 'thunderstorm' | 'cloud' | 'sun' | 'night' | 'fog' | 'snow' => {
    const code = current.weather_code;
    const cond = (current.condition || '').toLowerCase();
    const isNight = current.is_day !== undefined ? current.is_day === 0 : (() => {
      const hr = new Date().getHours();
      return hr < 6 || hr >= 18;
    })();

    if (code !== undefined) {
      if (code >= 95) return 'thunderstorm';
      if (code >= 71 && code <= 77) return 'snow';
      if (code >= 51 && code <= 82) return 'rain';
      if (code === 45 || code === 48) return 'fog';
      if (code >= 1 && code <= 3) return 'cloud';
      if (code === 0) return isNight ? 'night' : 'sun';
    }
    if (cond.includes('thunder') || cond.includes('storm')) return 'thunderstorm';
    if (cond.includes('snow') || cond.includes('sleet')) return 'snow';
    if (cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle')) return 'rain';
    if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) return 'fog';
    if (cond.includes('cloud') || cond.includes('overcast')) return 'cloud';
    return isNight ? 'night' : 'sun';
  }, [current.weather_code, current.condition, current.is_day]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const type = getAnimationType();

    // ── Particle structures ──
    interface RainDrop {
      x: number;
      y: number;
      len: number;
      speed: number;
      opacity: number;
      layer: 1 | 2 | 3; // 1: fine mist, 2: mid rain, 3: heavy foreground
      width: number;
    }

    interface Splash {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      opacity: number;
      beads: Array<{ x: number; y: number; vx: number; vy: number; life: number }>;
    }

    interface CloudPuff {
      x: number;
      y: number;
      rx: number;
      ry: number;
      speed: number;
      baseOpacity: number;
      darkness: number;
    }

    interface SnowFlake {
      x: number;
      y: number;
      radius: number;
      speed: number;
      swayOffset: number;
      swaySpeed: number;
      opacity: number;
    }

    let rainDrops: RainDrop[] = [];
    let splashes: Splash[] = [];
    let cloudPuffs: CloudPuff[] = [];
    let snowFlakes: SnowFlake[] = [];

    // Lightning state
    let lightningFlash = 0;
    let lightningCooldown = 180 + Math.floor(Math.random() * 240);
    let lightningBolt: Array<{ x: number; y: number }> = [];

    // Sun rays state
    let sunAngle = 0;

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.offsetWidth * dpr);
      canvas.height = Math.floor(canvas.offsetHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Initialize systems
    const initScene = () => {
      const w = W(), h = H();

      // Clouds (drifting volumetric storm banks)
      cloudPuffs = [];
      const cloudCount = type === 'thunderstorm' ? 14 : type === 'rain' ? 12 : type === 'cloud' ? 10 : type === 'fog' ? 16 : 4;
      for (let i = 0; i < cloudCount; i++) {
        cloudPuffs.push({
          x: Math.random() * (w + 200) - 100,
          y: Math.random() * (h * 0.65),
          rx: 90 + Math.random() * 160,
          ry: 50 + Math.random() * 90,
          speed: 0.15 + Math.random() * 0.35,
          baseOpacity: type === 'fog' ? 0.14 + Math.random() * 0.12 : 0.18 + Math.random() * 0.16,
          darkness: type === 'thunderstorm' ? 0.35 : type === 'rain' ? 0.25 : 0.15,
        });
      }

      // Rain particles — Evenly distributed, vertical fall (no one-sided bend!)
      rainDrops = [];
      splashes = [];
      if (type === 'rain' || type === 'thunderstorm') {
        const count = type === 'thunderstorm' ? 220 : 190;
        for (let i = 0; i < count; i++) {
          const rand = Math.random();
          // Layer 1: Background mist (40%)
          // Layer 2: Midground streaks (45%)
          // Layer 3: Foreground heavy drops (15%)
          const layer: 1 | 2 | 3 = rand < 0.4 ? 1 : rand < 0.85 ? 2 : 3;
          rainDrops.push({
            x: Math.random() * w,
            y: Math.random() * h,
            len: layer === 1 ? (14 + Math.random() * 10) : layer === 2 ? (26 + Math.random() * 18) : (44 + Math.random() * 26),
            speed: layer === 1 ? (14 + Math.random() * 5) : layer === 2 ? (22 + Math.random() * 8) : (32 + Math.random() * 10),
            opacity: layer === 1 ? (0.28 + Math.random() * 0.18) : layer === 2 ? (0.55 + Math.random() * 0.25) : (0.8 + Math.random() * 0.18),
            layer,
            width: layer === 1 ? 0.9 : layer === 2 ? 1.6 : 2.5,
          });
        }
      }

      // Snow
      snowFlakes = [];
      if (type === 'snow') {
        for (let i = 0; i < 90; i++) {
          snowFlakes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            radius: 1.4 + Math.random() * 3.4,
            speed: 0.8 + Math.random() * 1.6,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.02 + Math.random() * 0.03,
            opacity: 0.4 + Math.random() * 0.5,
          });
        }
      }
    };

    initScene();

    // Spawn splash ripple & micro-beads
    const createSplash = (x: number, y: number) => {
      if (splashes.length > 25) return;
      const beads = [];
      const beadCount = 2 + Math.floor(Math.random() * 3);
      for (let b = 0; b < beadCount; b++) {
        beads.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 2.4,
          vy: -(1.6 + Math.random() * 2.6),
          life: 1.0,
        });
      }
      splashes.push({
        x,
        y,
        radius: 2,
        maxRadius: 10 + Math.random() * 8,
        opacity: 0.75,
        beads,
      });
    };

    // Generate jagged lightning path
    const makeLightningBolt = (w: number, h: number) => {
      const pts = [];
      let curX = w * (0.25 + Math.random() * 0.5);
      let curY = 0;
      pts.push({ x: curX, y: curY });
      while (curY < h * 0.75) {
        curY += 25 + Math.random() * 35;
        curX += (Math.random() - 0.5) * 60;
        pts.push({ x: curX, y: curY });
      }
      return pts;
    };

    // ── Main Render Loop ──────────────────────────────────────────────────────
    const render = () => {
      const w = W(), h = H();
      if (w <= 0 || h <= 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Apple Weather Dynamic Sky Gradient Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (type === 'thunderstorm') {
        skyGrad.addColorStop(0, '#0a0f1c');
        skyGrad.addColorStop(0.35, '#121a2c');
        skyGrad.addColorStop(0.7, '#1b253b');
        skyGrad.addColorStop(1, '#151d2e');
      } else if (type === 'rain') {
        skyGrad.addColorStop(0, '#101726');
        skyGrad.addColorStop(0.35, '#1a2438');
        skyGrad.addColorStop(0.7, '#24324a');
        skyGrad.addColorStop(1, '#1c283c');
      } else if (type === 'cloud') {
        skyGrad.addColorStop(0, '#1c2738');
        skyGrad.addColorStop(0.5, '#2e3e55');
        skyGrad.addColorStop(1, '#3b4d68');
      } else if (type === 'fog') {
        skyGrad.addColorStop(0, '#1c2432');
        skyGrad.addColorStop(0.5, '#2d3848');
        skyGrad.addColorStop(1, '#394657');
      } else if (type === 'snow') {
        skyGrad.addColorStop(0, '#151e2b');
        skyGrad.addColorStop(0.5, '#253346');
        skyGrad.addColorStop(1, '#33445c');
      } else if (type === 'night') {
        // Deep clear night sky with subtle midnight glow
        skyGrad.addColorStop(0, '#060d1a');
        skyGrad.addColorStop(0.45, '#0b162c');
        skyGrad.addColorStop(1, '#122242');
      } else {
        // Sun / Clear Sky
        skyGrad.addColorStop(0, '#125496');
        skyGrad.addColorStop(0.45, '#1f77c8');
        skyGrad.addColorStop(1, '#3ca1f3');
      }

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Volumetric Clouds / Atmospheric Haze
      for (const c of cloudPuffs) {
        ctx.save();
        const rad = Math.max(c.rx, c.ry);
        const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rad);
        const dark = c.darkness;
        grad.addColorStop(0, `rgba(${Math.floor(25 + 40 * (1 - dark))}, ${Math.floor(35 + 50 * (1 - dark))}, ${Math.floor(55 + 70 * (1 - dark))}, ${c.baseOpacity})`);
        grad.addColorStop(0.6, `rgba(${Math.floor(40 + 50 * (1 - dark))}, ${Math.floor(55 + 65 * (1 - dark))}, ${Math.floor(80 + 90 * (1 - dark))}, ${c.baseOpacity * 0.5})`);
        grad.addColorStop(1, 'rgba(30, 45, 70, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        c.x += c.speed;
        if (c.x - c.rx > w + 60) {
          c.x = -c.rx - 40;
          c.y = Math.random() * (h * 0.65);
        }
      }

      // 3. Sun / God Rays (if sunny)
      if (type === 'sun') {
        sunAngle += 0.003;
        const sunX = w * 0.82, sunY = h * 0.16;
        const sunPulse = 1 + 0.08 * Math.sin(sunAngle * 3);

        // Core sun glow
        const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.45 * sunPulse);
        sunGlow.addColorStop(0, 'rgba(255, 235, 130, 0.45)');
        sunGlow.addColorStop(0.2, 'rgba(255, 190, 60, 0.22)');
        sunGlow.addColorStop(0.55, 'rgba(255, 140, 30, 0.08)');
        sunGlow.addColorStop(1, 'rgba(255, 120, 20, 0)');
        ctx.fillStyle = sunGlow;
        ctx.fillRect(0, 0, w, h);

        // Sun ray bands
        ctx.save();
        ctx.translate(sunX, sunY);
        ctx.rotate(sunAngle);
        for (let r = 0; r < 8; r++) {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = 'rgba(255, 245, 180, 0.04)';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-40, w);
          ctx.lineTo(40, w);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 3b. Moon / Night sky glow (if clear night)
      if (type === 'night') {
        const moonX = w * 0.82, moonY = h * 0.16;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, w * 0.35);
        moonGlow.addColorStop(0, 'rgba(215, 235, 255, 0.22)');
        moonGlow.addColorStop(0.35, 'rgba(180, 215, 255, 0.08)');
        moonGlow.addColorStop(1, 'rgba(180, 215, 255, 0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(0, 0, w, h);
      }

      // 4. Thunderstorm Lightning System
      if (type === 'thunderstorm') {
        lightningCooldown--;
        if (lightningCooldown <= 0) {
          lightningFlash = 0.55;
          lightningBolt = makeLightningBolt(w, h);
          lightningCooldown = 220 + Math.floor(Math.random() * 260);
        }

        if (lightningFlash > 0.01) {
          ctx.fillStyle = `rgba(215, 235, 255, ${lightningFlash * 0.6})`;
          ctx.fillRect(0, 0, w, h);

          if (lightningBolt.length > 1 && lightningFlash > 0.15) {
            ctx.save();
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            ctx.strokeStyle = `rgba(140, 210, 255, ${lightningFlash * 0.8})`;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(lightningBolt[0].x, lightningBolt[0].y);
            for (let i = 1; i < lightningBolt.length; i++) {
              ctx.lineTo(lightningBolt[i].x, lightningBolt[i].y);
            }
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${lightningFlash})`;
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.restore();
          }

          lightningFlash *= 0.84;
        }
      }

      // 5. Apple Weather Multi-Layer Even Vertical Rain Streaks (NOT BENT TO ONE SIDE)
      if (type === 'rain' || type === 'thunderstorm') {
        ctx.save();
        for (const d of rainDrops) {
          const tailX = d.x;
          const tailY = d.y;
          // Even vertical fall (no 15° slant)
          const headX = d.x;
          const headY = d.y + d.len;

          if (d.layer === 3) {
            // Foreground glistening droplet with linear gradient
            const dropGrad = ctx.createLinearGradient(tailX, tailY, headX, headY);
            dropGrad.addColorStop(0, 'rgba(180, 220, 255, 0.15)');
            dropGrad.addColorStop(0.7, `rgba(215, 240, 255, ${d.opacity})`);
            dropGrad.addColorStop(1, `rgba(255, 255, 255, ${Math.min(1, d.opacity + 0.15)})`);
            ctx.strokeStyle = dropGrad;
            ctx.lineWidth = d.width;
          } else if (d.layer === 2) {
            ctx.strokeStyle = `rgba(195, 228, 255, ${d.opacity})`;
            ctx.lineWidth = d.width;
          } else {
            // Background fine mist
            ctx.strokeStyle = `rgba(165, 205, 245, ${d.opacity})`;
            ctx.lineWidth = d.width;
          }

          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.stroke();

          // Advance raindrop straight down
          d.y += d.speed;

          // Check if droplet hits bottom area to trigger splash
          if (d.y > h - 45) {
            if (d.layer >= 2 && Math.random() < 0.22) {
              createSplash(d.x, Math.min(h - 5, d.y + 10));
            }
          }

          // Recycle drop when out of view
          if (d.y > h + d.len + 20) {
            d.y = -d.len - 15;
            d.x = Math.random() * w;
          }
        }
        ctx.restore();

        // 6. Surface Splash Ripples & Bouncing Beads
        ctx.save();
        for (let sIdx = splashes.length - 1; sIdx >= 0; sIdx--) {
          const s = splashes[sIdx];
          s.radius += 0.85;
          s.opacity *= 0.91;

          ctx.strokeStyle = `rgba(210, 235, 255, ${s.opacity})`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();

          for (const b of s.beads) {
            b.x += b.vx;
            b.y += b.vy;
            b.vy += 0.22;
            b.life *= 0.88;

            ctx.fillStyle = `rgba(230, 245, 255, ${b.life * s.opacity})`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }

          if (s.opacity < 0.05 || s.radius > s.maxRadius) {
            splashes.splice(sIdx, 1);
          }
        }
        ctx.restore();
      }

      // 7. Snow Particles
      if (type === 'snow') {
        ctx.save();
        for (const s of snowFlakes) {
          s.swayOffset += s.swaySpeed;
          s.x += Math.sin(s.swayOffset) * 0.85;
          s.y += s.speed;

          const snowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
          snowGrad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
          snowGrad.addColorStop(0.7, `rgba(225, 240, 255, ${s.opacity * 0.7})`);
          snowGrad.addColorStop(1, 'rgba(210, 230, 255, 0)');

          ctx.fillStyle = snowGrad;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();

          if (s.y > h + 10) {
            s.y = -10;
            s.x = Math.random() * w;
          }
          if (s.x > w + 10) s.x = -10;
          if (s.x < -10) s.x = w + 10;
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, [getAnimationType]);
  // ─── End Atmospheric Animation Engine ───────────────────────────────────────

  return (
    <div className={styles.card}>
      {/* ── Atmospheric Animation Canvas (fills entire card behind glass UI) ── */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }}
      />

      {/* ── Card Content (z-index: 10, rendered over dynamic sky canvas) ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* ── 1. Location Bar ────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.locationTitleGroup}>
            <span className={styles.locationPin} aria-hidden="true">📍</span>
            <span className={styles.locationName}>
              {translateLocation(location || weather.location_info?.name || 'India', language)}
            </span>
          </div>
          <div className={styles.headerActions}>
            <SourceBadge freshness={dataFreshness} sources={sources} language={language} />
            {onDownloadPdf && (
              <button
                className={styles.iconBtn}
                onClick={onDownloadPdf}
                title={getCardTranslation(language, 'downloadPdf', 'Download PDF')}
                aria-label={getCardTranslation(language, 'downloadPdf', 'Download PDF')}
              >
                📥
              </button>
            )}
            {onRefresh && (
              <button
                className={styles.iconBtn}
                onClick={onRefresh}
                title="Refresh weather data"
                aria-label="Refresh weather data"
              >
                🔄
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Hero Temperature & Conditions ───────────────────────── */}
        <div className={styles.heroSection}>
          <div className={styles.heroRow}>
            <div className={styles.heroTemp}>{currentTemp}°</div>
            <div className={styles.heroMeta}>
              <div className={styles.heroCondition}>
                {translatedCondition} {wmoEmoji}
              </div>
              <div className={styles.heroRange}>
                {tempMin}°~{tempMax}° {getCardTranslation(language, 'feelsLike', 'Feels like')} {feelsLike}°
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Official IMD Warning Banner ─────────────────────────── */}
        {primaryWarning && (
          <div
            className={styles.warningCard}
            style={{
              background: primaryWarning.severity === 'red'
                ? 'rgba(239, 68, 68, 0.22)'
                : primaryWarning.severity === 'orange'
                ? 'rgba(249, 115, 22, 0.22)'
                : 'rgba(245, 158, 11, 0.2)',
              border: `1px solid ${
                primaryWarning.severity === 'red'
                  ? 'rgba(239, 68, 68, 0.55)'
                  : primaryWarning.severity === 'orange'
                  ? 'rgba(249, 115, 22, 0.55)'
                  : 'rgba(245, 158, 11, 0.5)'
              }`,
            }}
          >
            <div className={styles.warningIconWrapper}>⚠️</div>
            <div className={styles.warningContent}>
              <div
                className={styles.warningTitle}
                style={{
                  color: primaryWarning.severity === 'red'
                    ? '#f87171'
                    : primaryWarning.severity === 'orange'
                    ? '#fb923c'
                    : '#fbbf24',
                }}
              >
                {translateWarningHazard(primaryWarning.hazard, language)}
              </div>
              <div className={styles.warningDesc}>
                {translateWarningDesc(primaryWarning.description || primaryWarning.advisory_text, location || weather.location_info?.name, language)}
              </div>
              <div className={styles.warningSource}>
                {getWarningSourceText(language)}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Current Conditions (Compact 2x3 Frosted Pill Grid) ───── */}
        <div className={styles.sectionTitle}>
          <span>{getCardTranslation(language, 'currentConditions', 'Current conditions')}</span>
        </div>
        <div className={styles.conditionsGrid}>
          {/* 1. UV Index */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>☀️</span>
              <span>{getCardTranslation(language, 'uvIndex', 'UV INDEX')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal}>{uvScore}</div>
              <div className={styles.widgetSubLabel}>{getCardTranslation(language, uvCategory.toLowerCase(), uvCategory)}</div>
              <div className={styles.barContainer}>
                <div className={styles.uvBar} />
                <div
                  className={styles.barDot}
                  style={{ left: `${Math.min(100, Math.max(0, (uvScore / 11) * 100))}%` }}
                />
              </div>
            </div>
            <div className={styles.widgetFooterText}>
              {uvScore <= 2
                ? getCardTranslation(language, 'uvLowDesc', 'Low for the rest of the day.')
                : uvScore <= 5
                ? getCardTranslation(language, 'uvModDesc', 'Moderate levels. Seek shade at midday.')
                : getCardTranslation(language, 'uvHighDesc', 'High risk. Sun protection required.')}
            </div>
          </div>

          {/* 2. Sunset / Sunrise */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>{isSunsetPassed ? '🌅' : '🌇'}</span>
              <span>{isSunsetPassed ? getCardTranslation(language, 'sunrise', 'SUNRISE') : getCardTranslation(language, 'sunset', 'SUNSET')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal}>{isSunsetPassed ? sunriseStr : sunsetStr}</div>
              <div className={styles.sunArcWrapper}>
                <svg viewBox="0 0 160 48" className={styles.sunArcSvg} aria-hidden="true">
                  <line x1="0" y1="24" x2="160" y2="24" stroke="rgba(255, 255, 255, 0.22)" strokeDasharray="3 3" />
                  {/* Daylight arc (above horizon) */}
                  <path
                    d="M 10 24 Q 80 5 150 24"
                    fill="none"
                    stroke={isDayTime ? "rgba(253, 224, 71, 0.65)" : "rgba(255, 255, 255, 0.2)"}
                    strokeWidth={isDayTime ? "2" : "1.2"}
                    strokeDasharray={isDayTime ? "none" : "3 3"}
                  />
                  {/* Nighttime trajectory (below horizon) */}
                  <path
                    d="M 150 24 Q 80 42 10 24"
                    fill="none"
                    stroke={!isDayTime ? "rgba(56, 189, 248, 0.65)" : "rgba(255, 255, 255, 0.15)"}
                    strokeWidth={!isDayTime ? "2" : "1.2"}
                    strokeDasharray={!isDayTime ? "none" : "3 3"}
                  />
                  {/* Horizon Markers: Sunrise (x=10) & Sunset (x=150) */}
                  <circle cx="10" cy="24" r="2.2" fill={isSunsetPassed ? "#38bdf8" : "rgba(255, 255, 255, 0.5)"} />
                  <circle cx="150" cy="24" r="2.2" fill={!isSunsetPassed ? "#fb923c" : "rgba(255, 255, 255, 0.3)"} />
                  {/* Sun Body & Glow */}
                  {isDayTime ? (
                    <>
                      <circle cx={sunX} cy={sunY} r="7.5" fill="rgba(253, 224, 71, 0.35)" />
                      <circle cx={sunX} cy={sunY} r="4.5" fill="#fde047" stroke="#ffffff" strokeWidth="1" />
                    </>
                  ) : (
                    <>
                      <circle cx={sunX} cy={sunY} r="6.5" fill="rgba(56, 189, 248, 0.3)" />
                      <circle cx={sunX} cy={sunY} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                    </>
                  )}
                </svg>
              </div>
            </div>
            <div className={styles.widgetFooterText}>
              {isSunsetPassed
                ? `${getCardTranslation(language, 'sunWas', 'Sunset was')} ${sunsetStr}`
                : `${getCardTranslation(language, 'sunAt', 'Sunrise:')} ${sunriseStr}`}
            </div>
          </div>

          {/* 3. Wind (High-DPI Apple Weather Compass Rose) */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>💨</span>
              <span>{getCardTranslation(language, 'wind', 'WIND')}</span>
            </div>
            <div className={styles.windBody}>
              <div className={styles.windData}>
                <div className={styles.widgetMainVal} style={{ fontSize: '1.65rem' }}>
                  {windSpeed} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{getCardTranslation(language, 'kmh', 'km/h')}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)', marginTop: '3px' }}>
                  {getCardTranslation(language, 'gusts', 'Gusts')}: <span style={{ color: '#ffffff', fontWeight: 600 }}>{windGusts} {getCardTranslation(language, 'kmh', 'km/h')}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, marginTop: '3px' }}>
                  {windDeg}° {windDirStr}
                </div>
              </div>
              <div className={styles.compassWrapper}>
                <svg viewBox="0 0 100 100" className={styles.compassSvg} aria-hidden="true">
                  <defs>
                    <radialGradient id="compassBgGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(30, 41, 59, 0.9)" />
                      <stop offset="85%" stopColor="rgba(15, 23, 42, 0.95)" />
                      <stop offset="100%" stopColor="rgba(30, 41, 59, 0.5)" />
                    </radialGradient>
                    <linearGradient id="needleBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                    <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.6" />
                    </filter>
                  </defs>
                  <circle cx="50" cy="50" r="46" fill="url(#compassBgGrad)" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" strokeDasharray="2 3" />
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                    const isCardinal = deg % 90 === 0;
                    return (
                      <line
                        key={deg}
                        x1="50"
                        y1={isCardinal ? "7" : "9"}
                        x2="50"
                        y2={isCardinal ? "13" : "12"}
                        stroke={isCardinal ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.3)"}
                        strokeWidth={isCardinal ? "1.75" : "1"}
                        strokeLinecap="round"
                        transform={`rotate(${deg}, 50, 50)`}
                      />
                    );
                  })}
                  <text x="50" y="21" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontWeight="800">N</text>
                  <text x="81" y="53" textAnchor="middle" fill="rgba(255, 255, 255, 0.8)" fontSize="8" fontWeight="700">E</text>
                  <text x="50" y="84" textAnchor="middle" fill="rgba(255, 255, 255, 0.8)" fontSize="8" fontWeight="700">S</text>
                  <text x="19" y="53" textAnchor="middle" fill="rgba(255, 255, 255, 0.8)" fontSize="8" fontWeight="700">W</text>
                  <g transform={`rotate(${windDeg}, 50, 50)`}>
                    <polygon points="50,14 44.5,41 55.5,41" fill="url(#needleBlueGrad)" filter="url(#needleGlow)" />
                    <polygon points="50,86 46,59 54,59" fill="rgba(255, 255, 255, 0.28)" />
                  </g>
                  <circle cx="50" cy="50" r="15" fill="rgba(15, 23, 42, 0.95)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
                  <text x="50" y="49" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="800">{windSpeed}</text>
                  <text x="50" y="58" textAnchor="middle" fill="rgba(255, 255, 255, 0.7)" fontSize="5.2" fontWeight="600">km/h</text>
                </svg>
              </div>
            </div>
            <div className={styles.widgetFooterText}>
              {windSpeed > 25
                ? getCardTranslation(language, 'breezy', 'Breezy conditions today.')
                : getCardTranslation(language, 'breezeGentle', 'Gentle breeze across the area.')}
            </div>
          </div>

          {/* 4. Feels Like */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>🌡️</span>
              <span>{getCardTranslation(language, 'feelsLike', 'FEELS LIKE')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal}>{feelsLike}°</div>
            </div>
            <div className={styles.widgetFooterText}>
              {feelsLikeNum < currentTempNum - 1
                ? getCardTranslation(language, 'feelsCoolerWind', 'Wind is making it feel cooler.')
                : feelsLikeNum > currentTempNum + 1
                ? getCardTranslation(language, 'feelsWarmerHumidity', 'Humidity is making it feel warmer.')
                : getCardTranslation(language, 'feelsSimilar', 'Similar to the actual temperature.')}
            </div>
          </div>

          {/* 5. Precipitation */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>💧</span>
              <span>{getCardTranslation(language, 'precipitation', 'PRECIPITATION')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal}>{(current.precipitation ?? 0).toFixed(1)} {getCardTranslation(language, 'mm', 'mm')}</div>
              <div className={styles.widgetSubLabel}>{getCardTranslation(language, 'inLast24h', 'in last 24h')}</div>
            </div>
            <div className={styles.widgetFooterText}>
              {todayForecast?.precipitation_sum
                ? `${todayForecast.precipitation_sum.toFixed(1)} ${getCardTranslation(language, 'mm', 'mm')} ${getCardTranslation(language, 'expectedToday', 'expected today.')}`
                : getCardTranslation(language, 'noRainNext24h', '0 mm expected in next 24h.')}
            </div>
          </div>

          {/* 6. Visibility */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>👁️</span>
              <span>{getCardTranslation(language, 'visibility', 'VISIBILITY')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal}>{visKm} {getCardTranslation(language, 'km', 'km')}</div>
            </div>
            <div className={styles.widgetFooterText}>
              {Number(visKm) >= 10
                ? getCardTranslation(language, 'visClear', 'Perfectly clear view.')
                : Number(visKm) >= 5
                ? getCardTranslation(language, 'visHaze', 'Light haze is affecting visibility.')
                : getCardTranslation(language, 'visFog', 'Fog or mist is reducing visibility.')}
            </div>
          </div>

          {/* 7. Humidity */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>💧</span>
              <span>{getCardTranslation(language, 'humidity', 'HUMIDITY')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal}>{humidityVal}%</div>
            </div>
            <div className={styles.widgetFooterText}>
              {getCardTranslation(language, 'dewPointDesc', `The dew point is ${dewPointVal}° right now.`).replace('{deg}', String(dewPointVal))}
            </div>
          </div>

          {/* 8. Pressure (High-DPI Aneroid Barometer Gauge) */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>⏲️</span>
              <span>{getCardTranslation(language, 'pressure', 'PRESSURE')}</span>
            </div>
            <div className={styles.pressureGaugeWrapper}>
              <svg viewBox="0 0 160 92" className={styles.pressureSvg} aria-hidden="true">
                <defs>
                  <linearGradient id="pressTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                  <filter id="pressGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38bdf8" floodOpacity="0.7" />
                  </filter>
                </defs>
                <path
                  d="M 28 78 A 56 56 0 1 1 132 78"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {[-110, -82, -55, -27, 0, 27, 55, 82, 110].map((ang) => {
                  const rad = ((ang - 90) * Math.PI) / 180;
                  const x1 = 80 + 50 * Math.cos(rad);
                  const y1 = 68 + 50 * Math.sin(rad);
                  const x2 = 80 + 44 * Math.cos(rad);
                  const y2 = 68 + 44 * Math.sin(rad);
                  return (
                    <line
                      key={ang}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={ang === 0 ? "#38bdf8" : "rgba(255, 255, 255, 0.35)"}
                      strokeWidth={ang === 0 ? "1.8" : "1"}
                      strokeLinecap="round"
                    />
                  );
                })}
                {(() => {
                  // Standard Mean Sea Level pressure calibration:
                  // Center tick (0°) represents standard 1013 hPa
                  // Low: 970 hPa (-110°), High: 1050 hPa (+110°)
                  const clamped = Math.max(970, Math.min(1055, pressureNum));
                  const needleAngle = Math.max(-110, Math.min(110, ((clamped - 1013) / 40) * 110));
                  const rad = ((needleAngle - 90) * Math.PI) / 180;
                  const nx = 80 + 56 * Math.cos(rad);
                  const ny = 68 + 56 * Math.sin(rad);
                  return (
                    <>
                      <circle cx={nx} cy={ny} r="4.5" fill="#38bdf8" filter="url(#pressGlow)" />
                      <circle cx={nx} cy={ny} r="2.2" fill="#ffffff" />
                      <line
                        x1="80"
                        y1="68"
                        x2={nx}
                        y2={ny}
                        stroke="url(#pressTrackGrad)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity="0.85"
                      />
                    </>
                  );
                })()}
                <circle cx="80" cy="68" r="4.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="24" y="88" fill="rgba(255, 255, 255, 0.65)" fontSize="9" fontWeight="700" textAnchor="middle">
                  {getCardTranslation(language, 'low', 'Low')}
                </text>
                <text x="80" y="50" fill="#ffffff" fontSize="15" fontWeight="800" textAnchor="middle" letterSpacing="-0.02em">
                  {pressureNum.toFixed(0)}
                </text>
                <text x="80" y="60" fill="#38bdf8" fontSize="7.5" fontWeight="700" textAnchor="middle">
                  hPa
                </text>
                <text x="136" y="88" fill="rgba(255, 255, 255, 0.65)" fontSize="9" fontWeight="700" textAnchor="middle">
                  {getCardTranslation(language, 'high', 'High')}
                </text>
              </svg>
            </div>
            <div className={styles.widgetFooterText} style={{ textAlign: 'center', paddingTop: '0.2rem' }}>
              {pressureNum < 1005
                ? getCardTranslation(language, 'pressLow', 'Low pressure system.')
                : pressureNum > 1022
                ? getCardTranslation(language, 'pressHigh', 'High pressure system.')
                : getCardTranslation(language, 'pressNormal', 'Normal atmospheric pressure.')}
            </div>
          </div>

          {/* 9. Air Quality (AQI) */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon} style={{ color: aqiColor }}>🍃</span>
              <span>{getCardTranslation(language, 'aqi', 'AIR QUALITY')}</span>
            </div>
            <div>
              <div className={styles.widgetMainVal} style={{ color: aqiColor }}>{aqiScore}</div>
              <div className={styles.widgetSubLabel} style={{ color: aqiColor }}>
                {getCardTranslation(language, aqiCategory.toLowerCase(), aqiCategory)}
              </div>
              <div className={styles.barContainer}>
                <div className={styles.aqiBar} />
                <div
                  className={styles.barDot}
                  style={{ left: `${Math.min(100, Math.max(0, (aqiScore / 300) * 100))}%` }}
                />
              </div>
            </div>
            <div className={styles.widgetFooterText}>
              {aqiScore <= 50
                ? getCardTranslation(language, 'aqiGoodDesc', 'Air quality is satisfactory.')
                : aqiScore <= 100
                ? getCardTranslation(language, 'aqiModDesc', 'Acceptable air quality.')
                : getCardTranslation(language, 'aqiPoorDesc', 'Unhealthy for sensitive groups.')}
            </div>
          </div>

          {/* 10. Moon Phase (Apple Weather Style) */}
          <div className={styles.appleWidget}>
            <div className={styles.widgetHeader}>
              <span className={styles.widgetHeaderIcon}>🌘</span>
              <span>{getCardTranslation(language, 'moonPhase', 'MOON PHASE')}</span>
            </div>
            <div className={styles.moonWidgetBody}>
              <div className={styles.moonData}>
                <div className={styles.widgetMainVal} style={{ fontSize: '1.25rem', lineHeight: '1.2' }}>
                  {getCardTranslation(language, moonData.phaseKey, moonData.phaseName)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.78)', marginTop: '4px' }}>
                  {getCardTranslation(language, 'moonIllumination', 'Illumination')}: <span style={{ color: '#ffffff', fontWeight: 600 }}>{moonData.illumination}%</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 600, marginTop: '3px' }}>
                  {moonData.isFullMoonNow ? (
                    getCardTranslation(language, 'fullMoonTonight', 'Full Moon tonight')
                  ) : (
                    `${getCardTranslation(language, 'nextFullMoon', 'Next Full Moon')}: ${moonData.displayDaysToFull}d`
                  )}
                </div>
              </div>
              <div className={styles.moonGraphicWrapper}>
                <svg viewBox="0 0 60 60" className={styles.moonSvg} aria-hidden="true">
                  <defs>
                    <radialGradient id="moonSphereGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="60%" stopColor="#e2e8f0" />
                      <stop offset="88%" stopColor="#94a3b8" />
                      <stop offset="100%" stopColor="#64748b" />
                    </radialGradient>
                    <clipPath id="moonLitClip">
                      {moonData.illumination >= 98 ? (
                        <circle cx="30" cy="30" r="23" />
                      ) : (
                        <path d={getMoonPath(moonData.age, 30, 30, 23)} />
                      )}
                    </clipPath>
                    <filter id="moonDiscGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#bae6fd" floodOpacity="0.4" />
                    </filter>
                  </defs>

                  {/* Dark lunar body */}
                  <circle cx="30" cy="30" r="23" fill="#0f172a" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1" />

                  {/* Illuminated lunar surface with crater texture */}
                  {moonData.illumination > 2 && (
                    <g filter="url(#moonDiscGlow)">
                      <g clipPath="url(#moonLitClip)">
                        {/* Base illuminated sphere */}
                        <circle cx="30" cy="30" r="23" fill="url(#moonSphereGrad)" />

                        {/* Lunar Maria (Dark Basaltic Plains) & Craters */}
                        <g opacity="0.38" fill="#334155">
                          {/* Oceanus Procellarum / Mare Imbrium */}
                          <ellipse cx="23" cy="22" rx="6.5" ry="5.5" />
                          <circle cx="19" cy="26" r="3.2" />
                          {/* Mare Serenitatis & Mare Tranquillitatis */}
                          <ellipse cx="36" cy="23" rx="5" ry="4" />
                          <ellipse cx="37" cy="30" rx="5.5" ry="4" />
                          {/* Mare Crisium */}
                          <ellipse cx="44" cy="24" rx="2.4" ry="3.2" />
                          {/* Mare Nubium & Humorum */}
                          <ellipse cx="24" cy="36" rx="5.5" ry="4.5" />
                          <circle cx="18" cy="38" r="2.8" />
                        </g>

                        {/* Distinct Lunar Craters with Rims */}
                        {/* Tycho Crater + Ray Center */}
                        <circle cx="30" cy="44" r="1.6" fill="#ffffff" opacity="0.85" />
                        <circle cx="30" cy="44" r="2.8" stroke="#475569" strokeWidth="0.75" fill="none" opacity="0.6" />
                        {/* Copernicus Crater */}
                        <circle cx="26" cy="28" r="1.5" fill="#ffffff" opacity="0.8" />
                        <circle cx="26" cy="28" r="2.5" stroke="#475569" strokeWidth="0.75" fill="none" opacity="0.55" />
                        {/* Kepler Crater */}
                        <circle cx="21" cy="29" r="1.2" fill="#ffffff" opacity="0.75" />

                        {/* Limb shading for realistic 3D sphere curvature */}
                        <circle cx="30" cy="30" r="23" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="1.8" />
                      </g>
                    </g>
                  )}
                  {/* Subtle outer rim highlight */}
                  <circle cx="30" cy="30" r="23" fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.75" />
                </svg>
              </div>
            </div>
            <div className={styles.widgetFooterText}>
              {moonData.isFullMoonNow ? (
                `${getCardTranslation(language, 'moonset', 'Moonset')}: ${sunriseStr} • ${getCardTranslation(language, 'moonDistance', 'Distance')}: 384,400 km`
              ) : (
                `${getCardTranslation(language, 'nextFullMoon', 'Next Full Moon')}: ${moonData.displayDaysToFull}d • ${getCardTranslation(language, 'moonset', 'Moonset')}: ${sunriseStr}`
              )}
            </div>
          </div>
        </div>

        {/* ── 5. Weather Tomorrow Banner ─────────────────────────────── */}
        {tomorrowSummary && (
          <div className={styles.tomorrowCard}>
            <div className={styles.tomorrowTitle}>
              {getCardTranslation(language, 'weatherTomorrow', 'Weather tomorrow')}
            </div>
            <div className={styles.tomorrowDesc}>
              {translateTomorrowSummary(tomorrowSummary, language)}
            </div>
          </div>
        )}

        {/* ── 6. Hourly Forecast Rail (Scrollable 24h) ────────────────── */}
        {hourly.length > 0 && (
          <>
            <div className={styles.sectionTitle}>
              <span>{getCardTranslation(language, 'hourlyForecast', 'Hourly forecast')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className={styles.sectionSubtitle}>{getCardTranslation(language, 'updatedNow', 'Updated now')}</span>
                <div className={styles.railNavBtns}>
                  <button type="button" className={styles.railNavBtn} onClick={() => scrollHourly(-240)} title="Scroll left" aria-label="Scroll left">‹</button>
                  <button type="button" className={styles.railNavBtn} onClick={() => scrollHourly(240)} title="Scroll right" aria-label="Scroll right">›</button>
                </div>
              </div>
            </div>
            <div
              ref={hourlyRailRef}
              className={styles.hourlyRail}
            >
              {hourly.slice(0, 24).map((item: HourlyForecastItem, idx: number) => {
                const rainProb = item.precipitation_probability ?? 0;
                const hIsDay = item.is_day !== undefined
                  ? item.is_day === 1
                  : (() => {
                      const h = Number(item.time.slice(11, 13));
                      return !isNaN(h) && h >= 6 && h < 18;
                    })();
                const emoji = item.emoji || getWmoEmoji(item.weather_code, hIsDay);
                return (
                  <div key={idx} className={styles.hourCard}>
                    <span className={styles.hourTime}>
                      {idx === 0
                        ? getCardTranslation(language, 'today', 'TODAY')
                        : item.time.slice(11, 16)}
                    </span>
                    <span className={styles.hourEmoji}>{emoji}</span>
                    <span className={styles.hourTemp}>
                      {item.temperature !== undefined ? Math.round(item.temperature) : '—'}°
                    </span>
                    {rainProb > 0 ? (
                      <span className={styles.hourRain}>💧{rainProb}%</span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.5)' }}>0%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── 7. 6-Day Forecast Strip ─────────────────────────────────── */}
        {daily.length > 0 && (
          <>
            <div className={styles.sectionTitle}>
              <span>{getCardTranslation(language, 'sixDayForecast', '6-DAY FORECAST')}</span>
            </div>
            <div className={styles.sixDayCard}>
              <div className={styles.sixDayGrid}>
                {daily.slice(0, 6).map((d: DailyForecastItem, i: number) => {
                  let dayLabel = getCardTranslation(language, 'today', 'TODAY');
                  if (i > 0) {
                    try {
                      const dateObj = new Date(d.date);
                      dayLabel = dateObj.toLocaleDateString(language === 'en' ? 'en-US' : `${language}-IN`, { weekday: 'short' }).toUpperCase();
                    } catch {
                      dayLabel = `D+${i}`;
                    }
                  }
                  const emoji = d.emoji || (d.condition ? '🌤️' : '☀️');
                  const maxT = d.temp_max !== undefined ? Math.round(d.temp_max) : 30;
                  const minT = d.temp_min !== undefined ? Math.round(d.temp_min) : 21;
                  return (
                    <div key={i} className={styles.sixDayCol}>
                      <span className={styles.sixDayDay}>{dayLabel}</span>
                      <span className={styles.sixDayEmoji}>{emoji}</span>
                      <span className={styles.sixDayMax}>{maxT}°</span>
                      <span className={styles.sixDayMin}>{minT}°</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── 8. Activities Suitability Index ─────────────────────────── */}
        <div className={styles.sectionTitle}>
          <span>{getCardTranslation(language, 'activities', 'Activities')}</span>
        </div>
        <div className={styles.activitiesGrid}>
          <ActivityPill
            icon="🏃"
            name={getCardTranslation(language, 'running', 'Running')}
            rating={activities.running?.rating || 'Fair'}
            language={language}
          />
          <ActivityPill
            icon="🚶"
            name={getCardTranslation(language, 'jogging', 'Jogging')}
            rating={activities.jogging?.rating || 'Fair'}
            language={language}
          />
          <ActivityPill
            icon="🚴"
            name={getCardTranslation(language, 'cycling', 'Cycling')}
            rating={activities.cycling?.rating || 'Fair'}
            language={language}
          />
          <ActivityPill
            icon="🥾"
            name={getCardTranslation(language, 'hiking', 'Hiking')}
            rating={activities.hiking?.rating || 'Fair'}
            language={language}
          />
        </div>

        {/* ── 9. Allergies Section ────────────────────────────────────── */}
        <div className={styles.sectionTitle}>
          <span>{getCardTranslation(language, 'allergies', 'Allergies')}</span>
        </div>
        <div className={styles.allergiesCard}>
          <div className={styles.conditionIcon} style={{ color: '#f59e0b' }}>💧</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
              {getCardTranslation(language, 'dustAndDander', 'Dust and dander')}
            </span>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: allergies?.dust_and_dander?.level === 'High' ? '#f97316' : '#22c55e',
                marginTop: 2,
              }}
            >
              {getCardTranslation(language, allergies?.dust_and_dander?.level || 'Moderate', allergies?.dust_and_dander?.level || 'Moderate')}
            </span>
          </div>
        </div>

        {/* ── 10. Live Weather Radar / Satellite Map Preview ──────────── */}
        <div className={styles.radarCard}>
          <div
            className={styles.radarImageContainer}
            onClick={() => onOpenSatellite?.('radar')}
            title="Click to open live IMD Doppler Radar & INSAT-3DS Viewer"
          >
            <Image
              src="/images/radar_preview.jpg"
              alt="Doppler Weather Radar India Preview"
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className={styles.radarImg}
              priority={false}
            />
            <div className={styles.radarOverlay}>
              <span className={styles.radarPulse}></span>
              <span>LIVE DOPPLER RADAR • IMD</span>
            </div>
            <div className={styles.radarExpandHint}>
              <span>Expand Live Viewer ↗</span>
            </div>
          </div>
          <div className={styles.radarActions}>
            <button
              type="button"
              className={styles.radarActionBtn}
              onClick={() => onOpenSatellite?.('radar')}
              title="Open Doppler Radar Mosaic"
            >
              <span>📡</span> {getCardTranslation(language, 'weatherRadar', 'Weather radar')}
            </button>
            <button
              type="button"
              className={styles.radarActionBtn}
              onClick={() => onOpenSatellite?.('satellite')}
              title="Open INSAT-3DS Satellite Viewer"
            >
              <span>🛰️</span> INSAT-3DS Satellite
            </button>
          </div>
        </div>

        {/* ── 11. Toggle More Details & Charts ────────────────────────── */}
        <button
          className={styles.toggleDetailsBtn}
          onClick={() => setShowDetails(!showDetails)}
          aria-expanded={showDetails}
        >
          <span>
            {showDetails
              ? `▲ ${getCardTranslation(language, 'hideDetails', 'Hide weather details')}`
              : `▼ ${getCardTranslation(language, 'moreDetails', 'More weather details & charts')}`}
          </span>
        </button>

        {showDetails && (
          <div className={styles.expandedDetails}>
            {/* Model Agreement */}
            {modelAgreement && modelAgreement !== 'not_applicable' && (
              <ModelAgreementPill agreement={modelAgreement} language={language} />
            )}

            {/* Interactive Chart */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
                📈 {language === 'hi' ? '7-दिवसीय तापमान व वर्षा रुझान' : language === 'kn' ? '7-ದಿನಗಳ ತಾಪಮಾನ ಮತ್ತು ಮಳೆ ಪ್ರವೃತ್ತಿ' : '7-Day Temperature & Rain Trends'}
              </div>
              <ChartPanel daily={daily} />
            </div>

            {/* Risk Factors */}
            {risks.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
                  ⚡ {language === 'hi' ? 'निर्धारित जोखिम मूल्यांकन' : language === 'kn' ? 'ನಿರ್ದಿಷ್ಟ ಅಪಾಯದ ಮೌಲ್ಯಮಾಪನಗಳು' : 'Deterministic Risk Assessments'}
                </div>
                <RisksPanel risks={risks} language={language} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function ActivityPill({
  icon,
  name,
  rating,
  language = 'en',
}: {
  icon: string;
  name: string;
  rating: string;
  language?: string;
}) {
  const ratingColor = rating === 'Good' ? '#22c55e' : rating === 'Fair' ? '#f59e0b' : '#ef4444';
  const translatedRating = getCardTranslation(language, rating.toLowerCase(), rating);

  return (
    <div className={styles.activityCard}>
      <div className={styles.activityIcon}>{icon}</div>
      <div className={styles.activityInfo}>
        <span className={styles.activityName}>{name}</span>
        <span className={styles.activityRating} style={{ color: ratingColor }}>
          {translatedRating}
        </span>
      </div>
    </div>
  );
}

function SourceBadge({
  freshness = 'live',
  sources = [],
  language = 'en',
}: {
  freshness?: DataFreshness;
  sources?: WeatherSource[];
  language?: string;
}) {
  const primary = sources?.find((s) => s.type === 'primary') || sources?.[0];
  const rawSourceName = primary?.name && primary.name !== 'Cache' ? primary.name : 'Open-Meteo (IMD-aligned)';
  const localizedSourceName = translateSourceName(rawSourceName, language);

  return (
    <div className={styles.sourceBadge} title={localizedSourceName}>
      <span className={styles.sourceBadgeIcon}>🛰️</span>
      <span className={styles.sourceBadgeText}>{localizedSourceName}</span>
    </div>
  );
}

function ModelAgreementPill({ agreement, language = 'en' }: { agreement?: ModelAgreement; language?: string }) {
  const colors: Record<string, { bg: string; text: string; icon: string } | null> = {
    high: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', icon: '✅' },
    moderate: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', icon: '⚠️' },
    low: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', icon: '❌' },
    not_applicable: null,
  };

  const key = agreement?.toLowerCase() || '';
  const c = colors[key];
  if (!c) return null;

  const translatedAgreement = getCardTranslation(language, key, agreement || '');
  const prefix = language === 'hi'
    ? 'मॉडल सहमति'
    : language === 'bn'
    ? 'মডেল চুক্তি'
    : language === 'te'
    ? 'మోడల్ ఒప్పందం'
    : language === 'ta'
    ? 'மாதிரி உடன்பாடு'
    : language === 'kn'
    ? 'ಮಾದರಿ ಒಪ್ಪಂದ'
    : language === 'mr'
    ? 'मॉडेल करार'
    : language === 'gu'
    ? 'મોડેલ કરાર'
    : 'Model agreement';

  const suffix = language === 'hi'
    ? 'आईएमडी-संरेखित ओपन-मेटियो बनाम जीएफएस एनडब्ल्यूपी'
    : language === 'bn'
    ? 'আইএমডি-সারিবদ্ধ ওপেন-মেটিও বনাম জিএফএস এনডব্লিউপি'
    : language === 'te'
    ? 'IMD-సరిపోలిన ఓపెన్-మెటియో vs GFS NWP'
    : language === 'ta'
    ? 'IMD-இணைக்கப்பட்ட ஓபன்-மெட்டியோ vs GFS NWP'
    : language === 'kn'
    ? 'IMD-ಹೊಂದಿಸಲಾದ ಓಪನ್-ಮೆಟಿಯೋ vs GFS NWP'
    : language === 'mr'
    ? 'आयएमडी-संरेखित ओपन-मेटिओ विरुद्ध GFS NWP'
    : language === 'gu'
    ? 'આઈએમડી-સંરેખિત ઓપન-મેટીઓ વિરુદ્ધ GFS NWP'
    : 'IMD-aligned Open-Meteo vs GFS NWP';

  return (
    <div
      style={{
        margin: '0.5rem 0',
        padding: '0.5rem 0.85rem',
        background: c.bg,
        borderRadius: '14px',
        fontSize: '0.8rem',
        color: c.text,
        border: '1px solid currentColor',
        backdropFilter: 'blur(10px)',
      }}
    >
      {c.icon} {prefix}: <strong>{translatedAgreement}</strong> — {suffix}
    </div>
  );
}

function ChartPanel({ daily }: { daily?: DailyForecastItem[] }) {
  if (!daily?.length) return null;
  const data = daily.slice(0, 7).map((d) => ({
    name: d.date.slice(5),
    max: d.temp_max,
    min: d.temp_min,
    rain: d.precipitation_sum,
  }));
  return (
    <div style={{ height: 180, width: '100%', marginTop: '0.5rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.7)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.7)' }} />
          <Tooltip
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '12px',
              fontSize: '0.78rem',
              color: '#ffffff',
              backdropFilter: 'blur(12px)',
            }}
          />
          <Line
            type="monotone"
            dataKey="max"
            stroke="#f97316"
            strokeWidth={2.5}
            name="Max °C"
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="min"
            stroke="#38bdf8"
            strokeWidth={2}
            name="Min °C"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RisksPanel({ risks, language = 'en' }: { risks: RiskItem[]; language?: string }) {
  if (!risks?.length) return null;
  const riskColors: Record<string, string> = {
    Low: '#22c55e',
    Moderate: '#f59e0b',
    High: '#f97316',
    Critical: '#ef4444',
    Extreme: '#ef4444',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {risks.map((r, i) => (
        <div
          key={i}
          style={{
            padding: '0.75rem 0.95rem',
            background: 'rgba(18, 26, 44, 0.52)',
            borderLeft: `4px solid ${riskColors[r.level] || '#38bdf8'}`,
            borderRadius: '14px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#ffffff' }}>
              {translateWarningHazard(r.hazard, language)}
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: riskColors[r.level],
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              {getCardTranslation(language, r.level.toLowerCase(), r.level)}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)', margin: '0.3rem 0' }}>
            {r.impact}
          </p>
          <p style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.65)' }}>
            👉 {r.recommended_action}
          </p>
        </div>
      ))}
    </div>
  );
}

const TOMORROW_PHRASE_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    'with thundery showers in the afternoon': 'और दोपहर में गरज के साथ बौछारें',
    'with a steady shower': 'और लगातार हल्की बौछारें',
    'with scattered drizzle': 'और छिटपुट बूंदाबांदी',
    'with a passing shower': 'और कभी-कभार हल्की बौछार',
    'with pleasant, mostly dry conditions': 'और मौसम सामान्यतः शुष्क और सुहावना रहेगा',
    'Weather forecast updating...': 'मौसम पूर्वानुमान अपडेट हो रहा है...',
  },
  bn: {
    'with thundery showers in the afternoon': 'এবং বিকেলে বজ্রবিদ্যুৎসহ বৃষ্টি',
    'with a steady shower': 'এবং একটানা হালকা বৃষ্টি',
    'with scattered drizzle': 'এবং বিক্ষিপ্ত গুঁড়ি গুঁড়ি বৃষ্টি',
    'with a passing shower': 'এবং ক্ষণস্থায়ী বৃষ্টি',
    'with pleasant, mostly dry conditions': 'এবং আবহাওয়া মনোরম ও শুষ্ক থাকবে',
  },
  te: {
    'with thundery showers in the afternoon': 'మరియు మధ్యాహ్నం ఉరుములతో కూడిన జల్లులు',
    'with a steady shower': 'మరియు నిరంతర జల్లులు',
    'with scattered drizzle': 'మరియు చెదురుమదురు చినుకులు',
    'with a passing shower': 'మరియు తేలికపాటి జల్లులు',
    'with pleasant, mostly dry conditions': 'మరియు పొడి, ఆహ్లాదకరమైన వాతావరణం',
  },
  ta: {
    'with thundery showers in the afternoon': 'மற்றும் பிற்பகலில் இடியுடன் கூடிய மழை',
    'with a steady shower': 'மற்றும் தொடர் மழை',
    'with scattered drizzle': 'மற்றும் ஆங்காங்கே தூறல்',
    'with a passing shower': 'மற்றும் விட்டு விட்டு மழை',
    'with pleasant, mostly dry conditions': 'மற்றும் வறண்ட, இதமான வானிலை',
  },
  kn: {
    'with thundery showers in the afternoon': 'ಮತ್ತು ಮಧ್ಯಾಹ್ನ ಗುಡುಗು ಸಹಿತ ಮಳೆ',
    'with a steady shower': 'ಮತ್ತು ನಿರಂತರ ಮಳೆ',
    'with scattered drizzle': 'ಮತ್ತು ಅಲ್ಲಲ್ಲಿ ತುಂತುರು ಮಳೆ',
    'with a passing shower': 'ಮತ್ತು ಕ್ಷಣಿಕ ಮಳೆ',
    'with pleasant, mostly dry conditions': 'ಮತ್ತು ಆಹ್ಲಾದಕರ ಒಣ ಹವಾಮಾನ',
  },
  mr: {
    'with thundery showers in the afternoon': 'आणि दुपारी मेघगर्जनेसह पाऊस',
    'with a steady shower': 'आणि संततधार पाऊस',
    'with scattered drizzle': 'आणि तुरळक रिमझिम',
    'with a passing shower': 'आणि हलक्या सरी',
    'with pleasant, mostly dry conditions': 'आणि हवामान सामान्यतः कोरडे व आल्हाददायक राहील',
  },
};

function translateTomorrowSummary(summary: string, lang: string): string {
  if (!summary || !lang || lang === 'en') return summary;
  const langDict = TOMORROW_PHRASE_TRANSLATIONS[lang] || TOMORROW_PHRASE_TRANSLATIONS['hi'];
  if (langDict) {
    for (const [enPhrase, natPhrase] of Object.entries(langDict)) {
      if (summary.includes(enPhrase)) {
        const condPart = summary.replace(enPhrase, '').trim();
        const translatedCond = getCardTranslation(lang, condPart, condPart);
        return `${translatedCond} ${natPhrase}`;
      }
    }
  }
  return getCardTranslation(lang, summary, summary);
}
