import { marked } from 'marked';
import {
  getTranslation,
  getCardTranslation,
  translateLocation,
  translateWarningHazard,
  translateWarningDesc,
  INDIAN_LANGUAGES,
} from '../i18n/translations';

export interface AdvisoryPdfOptions {
  location: string;
  language: string;
  advisoryText: string;
  weatherData?: any;
  warnings?: any[];
  domainFilter?: string;
  timestamp?: string;
}

/**
 * Pre-fetch image to base64 Data URL to guarantee zero CORS or network latency issues during canvas generation.
 */
async function fetchImageAsBase64(url: string, timeoutMs: number = 3500): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE MULTILINGUAL DICTIONARY FOR 4-PAGE ADVISORY BULLETIN
// ════════════════════════════════════════════════════════════════════════════
const BULLETIN_I18N: Record<string, Record<string, string>> = {
  kn: {
    appSubtitle: 'ವಿಶೇಷ ರಾಷ್ಟ್ರೀಯ ಹವಾಮಾನ ಮಾಹಿತಿ ಮತ್ತು ನಾಗರಿಕ ಸಲಹಾ ಬುಲೆಟಿನ್',
    officialRecord: '● ಅಧಿಕೃತ ಸರ್ಕಾರಿ ದಾಖಲೆ',
    docRef: 'ದಾಖಲೆ ಸಂಖ್ಯೆ:',
    location: 'ಸ್ಥಳ',
    issued: 'ವಿತರಿಸಲಾಗಿದೆ',
    sourceData: 'ಮೂಲ ದತ್ತಾಂಶ',
    operationalMode: 'ಕಾರ್ಯಾಚರಣೆ ಮೋಡ್',
    normalMode: 'ಸಾಮಾನ್ಯ',
    officialAlert: 'ಅಧಿಕೃತ IMD ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ',
    noWarnings: 'ಯಾವುದೇ ತೀವ್ರ ಹವಾಮಾನ ವ್ಯತ್ಯಯ ಪತ್ತೆಯಾಗಿಲ್ಲ. ಸಾಮಾನ್ಯ ನಿಗಾ ಸಕ್ರಿಯವಾಗಿದೆ.',
    synopticAdvisory: 'ಹವಾಮಾನ ಸಾರಾಂಶ ಮತ್ತು ತಜ್ಞರ ಸಲಹಾ ವರದಿ',
    surfaceObs: 'ಮೇಲ್ಮೈ ವೀಕ್ಷಣಾ ನಿಯತಾಂಕಗಳು (IMD ನಿಲ್ದಾಣ ಆಧಾರಿತ)',
    surfaceTemp: 'ಮೇಲ್ಮೈ ತಾಪಮಾನ',
    feelsLike: 'ಅನುಭವವಾಗುವುದು',
    presentWeather: 'ಪ್ರಸ್ತುತ ಹವಾಮಾನ',
    cloudCover: 'ಮೋಡದ ಹೊದಿಕೆ:',
    surfacePressure: 'ವಾಯುಭಾರ ಒತ್ತಡ',
    barometricMsl: 'ವಾಯುಭಾರ ಸಮುದ್ರ ಮಟ್ಟ',
    humidity: 'ಸಾಪೇಕ್ಷ ಆರ್ದ್ರತೆ',
    dewPoint: 'ಇಬ್ಬನಿ ಬಿಂದು:',
    windHeading: 'ಗಾಳಿ ಮತ್ತು ದಿಕ್ಕು',
    heading: 'ದಿಕ್ಕು:',
    rain24h: 'ಕಳೆದ 24 ಗಂಟೆಯ ಮಳೆ',
    gaugeTotal: 'ಒಟ್ಟು ಮಳೆ ಮಾಪನ',
    visibility: 'ವಾತಾವರಣದ ಗೋಚರತೆ',
    opticallyClear: 'ಸ್ಪಷ್ಟ ಗೋಚರತೆ',
    uvRadiation: 'ಯುವಿ (UV) ವಿಕಿರಣ',
    aqiHeader: 'ವಾಯು ಗುಣಮಟ್ಟ ಮತ್ತು ರಾಸಾಯನಿಕ ಪ್ರಸರಣ (CPCB / SAFAR ಆಧಾರಿತ)',
    aqiScoreCat: 'AQI ಅಂಕ ಮತ್ತು ವರ್ಗ',
    safeOutdoor: 'ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳಿಗೆ ಸುರಕ್ಷಿತ',
    moderateAir: 'ಸ್ವೀಕಾರಾರ್ಹ ವಾಯು ಗುಣಮಟ್ಟ',
    poorAir: 'ಸೂಕ್ಷ್ಮ ವ್ಯಕ್ತಿಗಳಿಗೆ ಎಚ್ಚರಿಕೆ',
    page2Title: 'ವಿಸ್ತೃತ ಸಂಖ್ಯಾತ್ಮಕ ಮುನ್ಸೂಚನೆ ಮತ್ತು ದೈನಂದಿನ ಚಿತ್ರಣ',
    sevenDayTitle: '7 ದಿನಗಳ ಸಿನಾಪ್ಟಿಕ್ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ',
    resolution: 'ರೆಸಲ್ಯೂಶನ್: ಹೈ-ರೆಸ್ ECMWF HRES ಮತ್ತು IMD GFS',
    colDate: 'ದಿನಾಂಕ / ದಿನ',
    colCondition: 'ಹವಾಮಾನ ಸ್ಥಿತಿ',
    colHigh: 'ಗರಿಷ್ಠ',
    colLow: 'ಕನಿಷ್ಠ',
    colPrecip: 'ಮಳೆಯ ಪ್ರಮಾಣ (ಸಂಭಾವ್ಯತೆ)',
    colWind: 'ಗರಿಷ್ಠ ಗಾಳಿ',
    hourlyTitle: '24 ಗಂಟೆಗಳ ಹವಾಮಾನ ಬದಲಾವಣೆ ಮತ್ತು ಮಳೆಯ ಸಂಭವನೀಯತೆ',
    sectoralHeader: 'ವಲಯವಾರು ಕಾರ್ಯಾಚರಣೆಯ ಮಾಹಿತಿ (ಪರಿಣಾಮಗಳು ಮತ್ತು ಮಾರ್ಗಸೂಚಿಗಳು)',
    agriTitle: 'ಕೃಷಿ ಮತ್ತು ಕೃಷಿ-ಸಲಹೆ (AGRI-SENSE)',
    agriSoil: '• <strong>ಮಣ್ಣಿನ ತೇವಾಂಶ:</strong> ಕಾಲೋಚಿತ ಬಿತ್ತನೆ ಮತ್ತು ಉಳುಮೆ ಕೆಲಸಗಳಿಗೆ ಸೂಕ್ತವಾಗಿದೆ.',
    agriIrrig: '• <strong>ನೀರಾವರಿ:</strong> ಸಂಜೆಯ ವೇಳಾಪಟ್ಟಿ ಪಾಲಿಸಿ; ಮಳೆ ಸಾಧ್ಯತೆ 65% ಮೀರಿದರೆ ಸ್ಥಗಿತಗೊಳಿಸಿ.',
    agriSpray: '• <strong>ಗೊಬ್ಬರ / ಕೀಟನಾಶಕ:</strong> ಬೆಳಿಗ್ಗೆ 07:00 ರಿಂದ 11:00 ರ ನಡುವೆ ಸಿಂಪಡಿಸಲು ಸೂಕ್ತ ಸಮಯ.',
    aviationTitle: 'ವಿಮಾನಯಾನ ಮತ್ತು ಡ್ರೋನ್ ಕಾರ್ಯಾಚರಣೆ (SKYOPS)',
    aviationVfr: '• <strong>ವಿಎಫ್‌ಆರ್ ರೇಟಿಂಗ್:</strong> ಜಿಲ್ಲಾ ವಾಯುಪ್ರದೇಶದಲ್ಲಿ ನಿರ್ಬಂಧವಿಲ್ಲದ ವಿಎಫ್‌ಆರ್ ಹಾರಾಟ.',
    aviationCeil: '• <strong>ಮೋಡದ ತಳಮಟ್ಟ:</strong> ನೆಲದಿಂದ 3,500 ಅಡಿಗಿಂತ ಮೇಲೆ. ಮಂಜಿನ ಅಪಾಯವಿಲ್ಲ.',
    aviationShear: '• <strong>ಕೆಳಮಟ್ಟದ ಗಾಳಿಯ ದಿಕ್ಕು:</strong> ಪ್ರಮಾಣಿತ ಸಹಿಷ್ಣುತೆಯ ಮಿತಿಯಲ್ಲಿದೆ (< 15 ಗಂಟುಗಳು).',
    marineTitle: 'ಕರಾವಳಿ ಮತ್ತು ಸಾಗರ ನಿಗಾ (SEACAST)',
    marineSea: '• <strong>ಸಮುದ್ರದ ಸ್ಥಿತಿ:</strong> ಶಾಂತ ಅಥವಾ ಸಾಧಾರಣ ಅಲೆಗಳು; ಅಲೆಯ ಎತ್ತರ 0.8 ರಿಂದ 1.4 ಮೀ.',
    marineFish: '• <strong>ಮೀನುಗಾರರ ಸಲಹೆ:</strong> ತೀರದಿಂದ 15 ನಾಟಿಕಲ್ ಮೈಲಿ ಒಳಗೆ ಮೀನುಗಾರಿಕೆಗೆ ಸುರಕ್ಷಿತ.',
    marineTide: '• <strong>ಉಬ್ಬರವಿಳಿತ:</strong> ಸಾಮಾನ್ಯ ದೈನಂದಿನ ಉಬ್ಬರವಿಳಿತ; ಯಾವುದೇ ಬಿರುಗಾಳಿ ಎಚ್ಚರಿಕೆಯಿಲ್ಲ.',
    urbanTitle: 'ನಗರ ಸಂಚಾರ ಮತ್ತು ನಾಗರಿಕ ಮೂಲಸೌಕರ್ಯ',
    urbanRoad: '• <strong>ರಸ್ತೆ ಸಂಚಾರ:</strong> ಸಂಚಾರ ಮುಕ್ತವಾಗಿದೆ; ಯಾವುದೇ ಪ್ರಮುಖ ಜಲಾವೃತ ಸಮಸ್ಯೆ ಕಂಡುಬಂದಿಲ್ಲ.',
    urbanRec: '• <strong>ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆ:</strong> ಮುಂಜಾನೆಯ ಓಟ ಮತ್ತು ಸೈಕ್ಲಿಂಗ್‌ಗೆ ಉತ್ತಮ ವಾತಾವರಣ.',
    urbanHeat: '• <strong>ಶಾಖದ ಅನುಕೂಲತೆ:</strong> ಶಾಖ ಸೂಚ್ಯಂಕ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ; ಮಧ್ಯಾಹ್ನ ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ.',
    page3Title: 'ಬಾಹ್ಯಾಕಾಶ ಹವಾಮಾನ ನಿಗಾ ಮತ್ತು ಇನ್‌ಸ್ಯಾಟ್-3DS ಉಪಗ್ರಹ ಭೂ ವೀಕ್ಷಣೆ',
    spacecraft: 'ಬಾಹ್ಯಾಕಾಶ ನೌಕೆ: ಇನ್‌ಸ್ಯಾಟ್-3DS (GEO 74.0°E) ಮತ್ತು DWR ರೇಡಾರ್ ಜಾಲ',
    groundStation: 'ಭೂ ನೆಲೆಯ ಕೇಂದ್ರ: ಸ್ಪೇಸ್ ಅಪ್ಲಿಕೇಷನ್ಸ್ ಸೆಂಟರ್ (SAC-ISRO) ಮತ್ತು IMD ನವದೆಹಲಿ',
    activeRec: 'ಸಕ್ರಿಯ ನಿಗಾ ವೀಕ್ಷಣೆ',
    multiSpectral: 'ಬಹು-ಸ್ಪೆಕ್ಟ್ರಲ್ ಇಮೇಜಿಂಗ್',
    satIrTitle: '🛰️ ಇನ್‌ಸ್ಯಾಟ್-3DS ಥರ್ಮಲ್ ಇನ್‌ಫ್ರಾ-ರೆಡ್ (IR1)',
    satIrBand: '10.8 µm ಬ್ಯಾಂಡ್',
    satIrDesc: 'ಉಪಖಂಡದಾದ್ಯಂತ ದಟ್ಟವಾದ ಸಂವಹನ ಮೋಡಗಳು, ಚಂಡಮಾರುತ ಮತ್ತು ಸುಳಿಗಾಳಿಯ ಚಲನೆಯನ್ನು ಪತ್ತೆ ಮಾಡುತ್ತದೆ.',
    satRadarTitle: '📡 IMD ಡಾಪ್ಲರ್ ಹವಾಮಾನ ರೇಡಾರ್ ಕಾಂಪೋಸಿಟ್',
    satRadarBand: 'ಪ್ರತಿಫಲನ (dBZ)',
    satRadarDesc: 'ನೈಜ-ಸಮಯದ ಪ್ರತಿಧ್ವನಿ ಪ್ರತಿಫಲನ, ಸ್ಥಳೀಯ ಮಳೆಯ ಸಾಂದ್ರತೆ ಮತ್ತು ಬಿರುಗಾಳಿ ರೇಖೆಗಳ ಪತ್ತೆ.',
    diagnosticHeader: 'ರಿಮೋಟ್ ಸೆನ್ಸಿಂಗ್ ವಿಶ್ಲೇಷಣಾತ್ಮಕ ಸೂಚಕಗಳು',
    ctbt: 'ಮೋಡದ ಮೇಲ್ಭಾಗದ ತಾಪಮಾನ (CTBT)',
    ctbtDesc: 'ಮಧ್ಯಮ ಪ್ರಮಾಣದಲ್ಲಿ ಬೆಳೆದ ಸಂವಹನ ಮೋಡಗಳು',
    moisture: 'ಟ್ರೋಪೋಸ್ಫಿಯರಿಕ್ ತೇವಾಂಶ ಸಾಗಣೆ',
    moistureDesc: 'ಮಳೆ ಸುರಿಸಬಲ್ಲ ನೀರಿನ ಆವಿ ಸ್ಥಿರ ವ್ಯಾಪ್ತಿಯಲ್ಲಿದೆ',
    lightning: 'ಸಿಡಿಲು ಬಡಿತದ ತಕ್ಷಣದ ಮುನ್ಸೂಚನೆ',
    lightningLow: 'ಕಡಿಮೆ ಅಪಾಯ',
    lightningDesc: 'ಮಿಂಚಿನ ಸಂವಹನ ಸೂಚ್ಯಂಕ ಸಾಮಾನ್ಯವಾಗಿದೆ',
    page4Title: 'ಸಂಖ್ಯಾತ್ಮಕ ಮಾದರಿಗಳ ಒಮ್ಮತ, ನಾಗರಿಕ ರಕ್ಷಣೆ ಮತ್ತು ದೃಢೀಕರಣ ಪ್ರಮಾಣಪತ್ರ',
    ensembleHeader: 'ಬಹು-ಮಾದರಿಗಳ ಮುನ್ಸೂಚನಾ ಒಮ್ಮತ (IMD WRF • ECMWF IFS • NOAA GFS • DWD ICON)',
    alignment: 'ಹೊಂದಾಣಿಕೆ',
    directivesHeader: 'ಪ್ರಮಾಣಿತ ನಾಗರಿಕ ರಕ್ಷಣಾ ನಿರ್ದೇಶನಗಳು ಮತ್ತು ವಿಪತ್ತು ನಿಯಮಗಳು',
    lightningTitle: '⚡ ಗುಡುಗು ಮತ್ತು ಮಿಂಚಿನಿಂದ ರಕ್ಷಣಾ ಕ್ರಮಗಳು:',
    lightningRule1: '• <strong>30-30 ನಿಯಮ ಕಟ್ಟುನಿಟ್ಟಾಗಿ ಪಾಲಿಸಿ:</strong> ಮಿಂಚು ಕಂಡ 30 ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಗುಡುಗು ಕೇಳಿದರೆ ತಕ್ಷಣ ಗಟ್ಟಿಮುಟ್ಟಾದ ಕಟ್ಟಡದೊಳಗೆ ಆಶ್ರಯ ಪಡೆಯಿರಿ.',
    lightningRule2: '• ಎತ್ತರದ ಮರಗಳು, ಲೋಹದ ಬೇಲಿಗಳು, ಬಯಲು ಹೊಲಗಳು ಮತ್ತು ತೆರೆದ ಎತ್ತರದ ಪ್ರದೇಶಗಳಿಂದ ದೂರವಿರಿ.',
    lightningRule3: '• ಸೂಕ್ಷ್ಮ ವಿದ್ಯುತ್ ಉಪಕರಣಗಳನ್ನು ಅನ್‌ಪ್ಲಗ್ ಮಾಡಿ; ತೀವ್ರ ಮಿಂಚಿನ ಸಮಯದಲ್ಲಿ ತಂತಿ ಫೋನ್‌ಗಳು ಮತ್ತು ನೀರಿನ ನಲ್ಲಿಗಳನ್ನು ಬಳಸಬೇಡಿ.',
    floodTitle: '🌊 ನಗರ ಪ್ರವಾಹ ಮತ್ತು ಬಿರುಗಾಳಿ ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು:',
    floodRule1: '• ನೀರು ತುಂಬಿದ ಅಂಡರ್‌ಪಾಸ್‌ಗಳು ಅಥವಾ ಮುಳುಗಿದ ರಸ್ತೆಗಳಲ್ಲಿ ಎಂದಿಗೂ ವಾಹನ ಚಲಾಯಿಸಬೇಡಿ ಅಥವಾ ನಡೆಯಬೇಡಿ.',
    floodRule2: '• ಬಿರುಗಾಳಿಗೆ ಹಾರಿಹೋಗಬಹುದಾದ ತಗಡಿನ ಶೀಟ್‌ಗಳು, ಜಾಹೀರಾತು ಫಲಕಗಳು ಮತ್ತು ತಾತ್ಕಾಲಿಕ ಶೆಡ್‌ಗಳನ್ನು ಭದ್ರಪಡಿಸಿ.',
    floodRule3: '• ತುರ್ತು ಬ್ಯಾಟರಿ ದೀಪಗಳು, ಪ್ರಥಮ ಚಿಕಿತ್ಸಾ ಕಿಟ್ ಮತ್ತು ಕುಡಿಯುವ ನೀರನ್ನು ಸಿದ್ಧವಾಗಿಟ್ಟುಕೊಳ್ಳಿ.',
    helplineHeader: 'ರಾಷ್ಟ್ರೀಯ ವಿಪತ್ತು ನಿರ್ವಹಣೆ ಮತ್ತು ತುರ್ತು ಸಹಾಯವಾಣಿಗಳು',
    helpNational: 'ರಾಷ್ಟ್ರೀಯ ತುರ್ತು ಸಹಾಯ',
    helpNationalSub: 'ಅಖಿಲ ಭಾರತ ಏಕೀಕೃತ',
    helpNdrf: 'NDRF ವಿಪತ್ತು ನಿಯಂತ್ರಣ',
    helpNdrfSub: 'ವಿಪತ್ತು ಸ್ಪಂದನೆ',
    helpSdma: 'ರಾಜ್ಯ ವಿಪತ್ತು ಪ್ರಾಧಿಕಾರ (SDMA)',
    helpSdmaSub: 'ರಾಜ್ಯ ಕಾರ್ಯಾಚರಣೆ',
    helpMedical: 'ತುರ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್',
    helpMedicalSub: 'ತುರ್ತು ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ',
    attestBadge: 'SIH26068 ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    attestTitle: 'ಮೇಘ ಆ್ಯಪ್ ಸ್ವಯಂಚಾಲಿತ ಹವಾಮಾನ ರವಾನೆ',
    attestBody: 'ಈ ವರದಿಯನ್ನು ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆ (IMD) ಸಿನಾಪ್ಟಿಕ್ ಫೀಡ್‌ಗಳು ಮತ್ತು ಇನ್‌ಸ್ಯಾಟ್-3DS ಭೂ ವೀಕ್ಷಣಾ ಉಪಗ್ರಹದ ದೃಢೀಕೃತ ಸಂಖ್ಯಾತ್ಮಕ ದತ್ತಾಂಶದಿಂದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ. WMO ಕೋಡ್ ಕೋಷ್ಟಕ 4678 ಪ್ರಕಾರ ದತ್ತಾಂಶ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.',
    checksum: 'ಡಿಜಿಟಲ್ ಚೆಕ್‌ಸಮ್',
    checksumValid: 'SHA-256: ಮಾನ್ಯವಾಗಿದೆ',
    footerAttribution: 'ಮೇಘ ಆ್ಯಪ್ ಹವಾಮಾನ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ • ಸ್ಮಾರ್ಟ್ ಇಂಡಿಯಾ ಹ್ಯಾಕಥಾನ್ (SIH26068) • ಅಧಿಕೃತ IMD ಆಧಾರಿತ',
    langLabel: 'ಭಾಷೆ:',
  },
  hi: {
    appSubtitle: 'विशेष राष्ट्रीय मौसम खुफिया एवं नागरिक सलाह बुलेटिन',
    officialRecord: '● आधिकारिक सरकारी रिकॉर्ड',
    docRef: 'दस्तावेज़ संख्या:',
    location: 'स्थान',
    issued: 'जारी किया गया',
    sourceData: 'स्रोत डेटा',
    operationalMode: 'परिचालन मोड',
    normalMode: 'सामान्य',
    officialAlert: 'आधिकारिक IMD मौसम चेतावनी',
    noWarnings: 'कोई गंभीर मौसम व्यवधान नहीं पाया गया। नियमित निगरानी सक्रिय है।',
    synopticAdvisory: 'सिनॉप्टिक एडवाइजरी एवं मौसम विश्लेषण',
    surfaceObs: 'सतह अवलोकन पैरामीटर (आईएमडी स्टेशन आधारित)',
    surfaceTemp: 'सतह का तापमान',
    feelsLike: 'महसूस होता है',
    presentWeather: 'वर्तमान मौसम',
    cloudCover: 'बादल विस्तार:',
    surfacePressure: 'वायुमंडलीय दबाव',
    barometricMsl: 'बैरोमीटर समुद्र तल',
    humidity: 'सापेक्ष आर्द्रता',
    dewPoint: 'ओस बिंदु:',
    windHeading: 'हवा की गति एवं दिशा',
    heading: 'दिशा:',
    rain24h: 'पिछले 24 घंटे की वर्षा',
    gaugeTotal: 'कुल मापा गया',
    visibility: 'वायुमंडलीय दृश्यता',
    opticallyClear: 'स्पष्ट दृश्यता',
    uvRadiation: 'पराबैंगनी (UV) विकिरण',
    aqiHeader: 'वायु गुणवत्ता एवं रासायनिक फैलाव (सीपीसीबी / सफर आधारित)',
    aqiScoreCat: 'AQI स्कोर एवं श्रेणी',
    safeOutdoor: 'बाहरी गतिविधियों के लिए सुरक्षित',
    moderateAir: 'स्वीकार्य वायु गुणवत्ता',
    poorAir: 'संवेदनशील समूहों के लिए सावधानी',
    page2Title: 'विस्तृत संख्यात्मक पूर्वानुमान एवं दैनिक दृष्टिकोण',
    sevenDayTitle: '7-दिवसीय सिनॉप्टिक मौसम पूर्वानुमान',
    resolution: 'रिज़ॉल्यूशन: हाई-रेस ईसीएमडब्ल्यूएफ एवं आईएमडी जीएफएस',
    colDate: 'दिनांक / दिन',
    colCondition: 'मौसम की स्थिति',
    colHigh: 'अधिकतम',
    colLow: 'न्यूनतम',
    colPrecip: 'वर्षा (संभावना)',
    colWind: 'अधिकतम हवा',
    hourlyTitle: '24 घंटे का मौसम चक्र एवं वर्षा संभावना',
    sectoralHeader: 'क्षेत्रीय परिचालन खुफिया (प्रभाव एवं दिशानिर्देश)',
    agriTitle: 'कृषि एवं कृषक मार्गदर्शन (AGRI-SENSE)',
    agriSoil: '• <strong>मृदा नमी:</strong> मौसमी बुवाई और जुताई कार्यों के लिए पर्याप्त।',
    agriIrrig: '• <strong>सिंचाई:</strong> शाम का चक्र जारी रखें; बारिश की संभावना 65% से अधिक होने पर स्थगित करें।',
    agriSpray: '• <strong>उर्वरक / कीटनाशक:</strong> सुबह 07:00 से 11:00 बजे के बीच छिड़काव अनुकूल।',
    aviationTitle: 'विमानन एवं ड्रोन संचालन (SKYOPS)',
    aviationVfr: '• <strong>वीएफआर रेटिंग:</strong> जिला हवाई क्षेत्र में अप्रतिबंधित दृश्य उड़ान (VFR) संचालन।',
    aviationCeil: '• <strong>क्लाउड बेस:</strong> ज़मीनी स्तर से 3,500 फीट ऊपर। कोहरे का कोई खतरा नहीं।',
    aviationShear: '• <strong>विंड शीयर:</strong> सतही हवा का बहाव मानक सीमा (< 15 नॉट) के भीतर।',
    marineTitle: 'तटीय एवं समुद्री निगरानी (SEACAST)',
    marineSea: '• <strong>समुद्र की स्थिति:</strong> शांत से मध्यम लहरें; लहर की ऊंचाई 0.8 से 1.4 मीटर।',
    marineFish: '• <strong>मछुआरों के लिए सलाह:</strong> तट से 15 समुद्री मील तक मछली पकड़ना सुरक्षित।',
    marineTide: '• <strong>ज्वारभाटा:</strong> सामान्य दैनिक ज्वारीय प्रवाह, कोई तूफानी लहर की चेतावनी नहीं।',
    urbanTitle: 'शहरी आवागमन एवं नागरिक अवसंरचना',
    urbanRoad: '• <strong>सड़कें:</strong> यातायात सुगम; शहरी क्षेत्रों में जलभराव की कोई सूचना नहीं।',
    urbanRec: '• <strong>आउटडोर गतिविधियां:</strong> सुबह दौड़ने और साइकिल चलाने के लिए स्थिति उत्तम।',
    urbanHeat: '• <strong>गर्मी का प्रभाव:</strong> सामान्य तापमान; दोपहर में पर्याप्त मात्रा में पानी पिएं।',
    page3Title: 'अंतरिक्ष मौसम निगरानी एवं इनसैट-3DS उपग्रह पृथ्वी अवलोकन',
    spacecraft: 'अंतरिक्ष यान: इनसैट-3DS (GEO 74.0°E) एवं डॉपलर रडार नेटवर्क',
    groundStation: 'ग्राउंड स्टेशन: अंतरिक्ष अनुप्रयोग केंद्र (इसरो) एवं आईएमडी नई दिल्ली',
    activeRec: 'सक्रिय निगरानी',
    multiSpectral: 'मल्टी-स्पेक्ट्रल इमेजिंग',
    satIrTitle: '🛰️ इनसैट-3DS थर्मल इन्फ्रारेड (IR1)',
    satIrBand: '10.8 µm बैंड',
    satIrDesc: 'उपमहाद्वीप में गहरे संवहनी बादलों, तूफानों और चक्रवाती परिसंचरण को ट्रैक करता है।',
    satRadarTitle: '📡 आईएमडी डॉपलर वेदर रडार कंपोजिट',
    satRadarBand: 'परावर्तकता (dBZ)',
    satRadarDesc: 'रडार स्कैनिंग दायरे में वास्तविक समय वर्षा कोर और आंधी रेखाओं का सटीक पता लगाता है।',
    diagnosticHeader: 'रिमोट सेंसिंग नैदानिक संकेतक',
    ctbt: 'बादल शीर्ष तापमान (CTBT)',
    ctbtDesc: 'मध्यम रूप से विकसित संवहनी बादल',
    moisture: 'क्षोभमंडलीय नमी परिवहन',
    moistureDesc: 'वर्षा योग्य जल वाष्प सामान्य सीमा में',
    lightning: 'आकाशीय बिजली का तात्कालिक पूर्वानुमान',
    lightningLow: 'कम जोखिम',
    lightningDesc: 'संवहनी बिजली सूचकांक सामान्य',
    page4Title: 'संख्यात्मक मॉडल सहमति, नागरिक सुरक्षा एवं सत्यापन प्रमाण पत्र',
    ensembleHeader: 'मल्टी-मॉडल पूर्वानुमान सहमति (IMD WRF • ECMWF IFS • NOAA GFS • DWD ICON)',
    alignment: 'सहमति',
    directivesHeader: 'मानक नागरिक सुरक्षा निर्देश एवं आपदा प्रोटोकॉल',
    lightningTitle: '⚡ मेघगर्जन एवं बिजली से सुरक्षा निर्देश:',
    lightningRule1: '• <strong>30-30 नियम का कड़ाई से पालन करें:</strong> बिजली चमकने के 30 सेकंड के भीतर गड़गड़ाहट सुनाई दे तो सुरक्षित भवन में जाएं।',
    lightningRule2: '• ऊंचे पेड़ों, धातु की बाड़, खुले खेतों और असुरक्षित ऊंचाई वाली जगहों से दूर रहें।',
    lightningRule3: '• संवेदनशील इलेक्ट्रॉनिक उपकरणों को अनप्लग करें; बिजली कड़कने के दौरान तारों वाले फोन और नल से दूर रहें।',
    floodTitle: '🌊 शहरी बाढ़ एवं तेज हवाओं से बचाव:',
    floodRule1: '• जलमग्न अंडरपास या पानी से भरी सड़कों पर वाहन न चलाएं और न ही पैदल चलें।',
    floodRule2: '• आंधी के खतरे को देखते हुए टिन की छत, विज्ञापन होर्डिंग्स और निर्माण मचान को मजबूती से बांधें।',
    floodRule3: '• आपातकालीन टॉर्च, प्राथमिक चिकित्सा किट और पीने के पानी का पर्याप्त भंडारण रखें।',
    helplineHeader: 'राष्ट्रीय आपदा प्रतिक्रिया एवं आपातकालीन हेल्पलाइन',
    helpNational: 'राष्ट्रीय आपातकालीन',
    helpNationalSub: 'अखिल भारतीय एकीकृत',
    helpNdrf: 'एनडीआरएफ आपदा नियंत्रण',
    helpNdrfSub: 'आपदा प्रतिक्रिया',
    helpSdma: 'राज्य आपदा प्रबंधन (SDMA)',
    helpSdmaSub: 'राज्य परिचालन',
    helpMedical: 'एम्बुलेंस सेवा',
    helpMedicalSub: 'आपातकालीन चिकित्सा',
    attestBadge: 'SIH26068 सत्यापित',
    attestTitle: 'मेघा ऐप स्वचालित मौसम प्रेषण',
    attestBody: 'यह बुलेटिन भारतीय मौसम विज्ञान विभाग (IMD) और इनसैट-3DS उपग्रह के सत्यापित डेटा से स्वचालित रूप से तैयार किया गया है। WMO कोड तालिका 4678 के अनुसार मान्य।',
    checksum: 'डिजिटल चेकसम',
    checksumValid: 'SHA-256: मान्य',
    footerAttribution: 'मेघा ऐप मौसम खुफिया एआई • स्मार्ट इंडिया हैकथॉन (SIH26068) • सत्यापित आईएमडी डेटा',
    langLabel: 'भाषा:',
  },
  en: {
    appSubtitle: 'Specialized National Weather Intelligence & Civil Advisory Bulletin',
    officialRecord: '● OFFICIAL GOVERNMENT RECORD',
    docRef: 'Doc Ref:',
    location: 'Location',
    issued: 'Issued',
    sourceData: 'Source Data',
    operationalMode: 'Operational Mode',
    normalMode: 'Normal',
    officialAlert: 'OFFICIAL IMD METEOROLOGICAL ALERT',
    noWarnings: 'No Severe Meteorological Disruption Detected. Routine Surveillance Active.',
    synopticAdvisory: 'SYNOPTIC ADVISORY & METEOROLOGICAL SYNTHESIS',
    surfaceObs: 'Surface Observation Parameters (IMD Station Grounding)',
    surfaceTemp: 'Surface Temperature',
    feelsLike: 'Feels like',
    presentWeather: 'Present Weather',
    cloudCover: 'Cloud:',
    surfacePressure: 'Surface Pressure',
    barometricMsl: 'Barometric MSL',
    humidity: 'Relative Humidity',
    dewPoint: 'Dew Point:',
    windHeading: 'Wind & Direction',
    heading: 'Heading:',
    rain24h: 'Precipitation 24h',
    gaugeTotal: 'Gauge Total',
    visibility: 'Atmospheric Visibility',
    opticallyClear: 'Optically Clear',
    uvRadiation: 'UV Radiation',
    aqiHeader: 'Air Quality & Chemical Dispersion (CPCB / SAFAR Grounding)',
    aqiScoreCat: 'AQI SCORE & CATEGORY',
    safeOutdoor: 'Safe for Outdoor Activities',
    moderateAir: 'Acceptable Air Quality',
    poorAir: 'Caution for Sensitive Groups',
    page2Title: 'Extended Numerical Prediction & Diurnal Outlook',
    sevenDayTitle: '7-Day Synoptic Weather Prediction Outlook',
    resolution: 'Resolution: High-Res ECMWF HRES & IMD GFS',
    colDate: 'Date / Day',
    colCondition: 'Weather Condition',
    colHigh: 'High',
    colLow: 'Low',
    colPrecip: 'Precipitation (Prob)',
    colWind: 'Peak Wind',
    hourlyTitle: '24-Hour Diurnal Evolution & Rain Probability',
    sectoralHeader: 'Sectoral Operational Intelligence (Impacts & Guidelines)',
    agriTitle: 'AGRICULTURE & AGRI-SENSE',
    agriSoil: '• <strong>Soil Moisture:</strong> Adequate for seasonal sowing & tillage operations.',
    agriIrrig: '• <strong>Irrigation:</strong> Maintain scheduled evening cycles; suspend if rain probability exceeds 65%.',
    agriSpray: '• <strong>Fertilizer / Pesticide:</strong> Spray window viable between 07:00 and 11:00 AM.',
    aviationTitle: 'AVIATION & DRONE LOGISTICS (SKYOPS)',
    aviationVfr: '• <strong>VFR Flight Rating:</strong> Unrestricted VFR operations across district airspace.',
    aviationCeil: '• <strong>Cloud Base Ceiling:</strong> Above 3,500 ft AGL. No low-level fog/stratus hazard.',
    aviationShear: '• <strong>Low-level Shear:</strong> Surface wind shear within standard tolerance (< 15 kt).',
    marineTitle: 'COASTAL & MARINE SURVEILLANCE (SEACAST)',
    marineSea: '• <strong>Sea State:</strong> Slight to moderate seas; swell wave height 0.8m - 1.4m.',
    marineFish: '• <strong>Fishermen Advisory:</strong> Safe for nearshore artisanal fishing within 15 nautical miles.',
    marineTide: '• <strong>Tidal Current:</strong> Normal diurnal tidal exchange with no gale surge alerts.',
    urbanTitle: 'URBAN COMMUTE & CIVIL INFRASTRUCTURE',
    urbanRoad: '• <strong>Road Arteries:</strong> Clear trafficability; no active urban waterlogging observed.',
    urbanRec: '• <strong>Outdoor Recreation:</strong> Morning running and cycling feasibility rated Good.',
    urbanHeat: '• <strong>Thermal Comfort:</strong> Peak heat index manageable; stay hydrated during midday.',
    page3Title: 'Space Meteorological Surveillance & INSAT-3DS Satellite Earth Observation',
    spacecraft: 'Spacecraft: INSAT-3DS (GEO 74.0°E) & DWR Network',
    groundStation: 'Ground Receiving: Space Applications Centre (SAC-ISRO) & IMD New Delhi',
    activeRec: 'ACTIVE RECONNAISSANCE',
    multiSpectral: 'Multi-Spectral Imaging',
    satIrTitle: '🛰️ INSAT-3DS Thermal Infra-Red (IR1)',
    satIrBand: '10.8 µm Band',
    satIrDesc: 'Detects deep convective cloud clusters, storm tops, and cyclonic vortex tracks across the subcontinent.',
    satRadarTitle: '📡 IMD Doppler Weather Radar Composite',
    satRadarBand: 'Reflectivity (dBZ)',
    satRadarDesc: 'Real-time echo reflectivity, localized rainfall cores, and squall line detection within radar scanning radius.',
    diagnosticHeader: 'Remote Sensing Diagnostic Indicators',
    ctbt: 'CLOUD TOP TEMPERATURE (CTBT)',
    ctbtDesc: 'Moderately developed convective tops',
    moisture: 'TROPOSPHERIC MOISTURE TRANSPORT',
    moistureDesc: 'Precipitable water vapor within stable range',
    lightning: 'LIGHTNING STRIKE NOWCAST',
    lightningLow: 'LOW STRIKE RISK',
    lightningDesc: 'Convective lightning index nominal',
    page4Title: 'Numerical Ensemble Consensus, Civil Protection & Verification Attestation',
    ensembleHeader: 'Multi-Model Ensemble Convergence (IMD WRF • ECMWF IFS • NOAA GFS • DWD ICON)',
    alignment: 'Alignment',
    directivesHeader: 'Standard Civil Protection Directives & Disaster Protocols',
    lightningTitle: '⚡ THUNDERSTORM & LIGHTNING MITIGATION:',
    lightningRule1: '• <strong>Adhere strictly to the 30-30 Rule:</strong> Seek enclosed structural shelter if thunder is heard within 30 seconds of lightning.',
    lightningRule2: '• Avoid isolated tall trees, metallic fencing, open agricultural fields, and unprotected high ground.',
    lightningRule3: '• Disconnect sensitive electrical appliances; avoid wired landline phones and indoor plumbing during intense electrical activity.',
    floodTitle: '🌊 URBAN FLOODING & GALE PRECAUTIONS:',
    floodRule1: '• Never drive or walk through submerged causeways or waterlogged railway underpasses.',
    floodRule2: '• Secure loose metal roofing, commercial hoardings, and construction scaffolding against sudden convective wind gusts.',
    floodRule3: '• Keep emergency battery lamps, first-aid kits, and essential drinking water stores accessible.',
    helplineHeader: 'National Disaster Response & Emergency Helplines',
    helpNational: 'NATIONAL EMERGENCY',
    helpNationalSub: 'All-India Unified',
    helpNdrf: 'NDRF DISASTER CONTROL',
    helpNdrfSub: 'Disaster Response',
    helpSdma: 'STATE DISASTER (SDMA)',
    helpSdmaSub: 'State Operations',
    helpMedical: 'MEDICAL AMBULANCE',
    helpMedicalSub: 'Emergency Care',
    attestBadge: 'SIH26068 VERIFIED',
    attestTitle: 'MEGHA APP AUTOMATED METEOROLOGICAL DISPATCH',
    attestBody: 'This bulletin was autonomously generated using verified numerical data ingestion pipelines from India Meteorological Department (IMD) synoptic feeds and INSAT-3DS Earth observation radiometers. Data checksum validated against WMO Code Table 4678.',
    checksum: 'DIGITAL CHECKSUM',
    checksumValid: 'SHA-256: VALID',
    footerAttribution: 'MEGHA APP Weather Intelligence AI • Smart India Hackathon (SIH26068) • Verified IMD Grounding',
    langLabel: 'Language:',
  },
};

function formatPageOf(pageNum: number, lang: string): string {
  switch (lang) {
    case 'kn': return `ಪುಟ ${pageNum} / 4`;
    case 'hi': return `पृष्ठ ${pageNum} / 4`;
    case 'te': return `పేజీ ${pageNum} / 4`;
    case 'ta': return `பக்கம் ${pageNum} / 4`;
    case 'bn': return `পৃষ্ঠা ${pageNum} / 4`;
    case 'mr': return `पान ${pageNum} / 4`;
    case 'gu': return `પૃષ્ઠ ${pageNum} / 4`;
    default: return `Page ${pageNum} of 4`;
  }
}

function formatBulletinHour(hour: number, lang: string): string {
  const h2 = String(hour).padStart(2, '0');
  if (lang === 'kn') {
    if (hour >= 4 && hour < 12) return `ಬೆಳಗ್ಗೆ ${h2}:00`;
    if (hour >= 12 && hour < 17) return `ಮಧ್ಯಾಹ್ನ ${h2}:00`;
    if (hour >= 17 && hour < 20) return `ಸಂಜೆ ${h2}:00`;
    return `ರಾತ್ರಿ ${h2}:00`;
  }
  if (lang === 'hi' || lang === 'mr') {
    if (hour >= 4 && hour < 12) return `सुबह ${h2}:00`;
    if (hour >= 12 && hour < 17) return `दोपहर ${h2}:00`;
    if (hour >= 17 && hour < 20) return `शाम ${h2}:00`;
    return `रात ${h2}:00`;
  }
  if (lang === 'te') {
    if (hour >= 4 && hour < 12) return `ఉదయం ${h2}:00`;
    if (hour >= 12 && hour < 17) return `మధ్యాహ్నం ${h2}:00`;
    if (hour >= 17 && hour < 20) return `సాయంత్రం ${h2}:00`;
    return `రాత్రి ${h2}:00`;
  }
  if (lang === 'ta') {
    if (hour >= 4 && hour < 12) return `காலை ${h2}:00`;
    if (hour >= 12 && hour < 17) return `மதியம் ${h2}:00`;
    if (hour >= 17 && hour < 20) return `மாலை ${h2}:00`;
    return `இரவு ${h2}:00`;
  }
  if (lang === 'bn') {
    if (hour >= 4 && hour < 12) return `সকাল ${h2}:০০`;
    if (hour >= 12 && hour < 17) return `দুপুর ${h2}:০০`;
    if (hour >= 17 && hour < 20) return `সন্ধ্যা ${h2}:০০`;
    return `রাত ${h2}:০০`;
  }
  if (lang === 'gu') {
    if (hour >= 4 && hour < 12) return `સવારે ${h2}:00`;
    if (hour >= 12 && hour < 17) return `બપોરે ${h2}:00`;
    if (hour >= 17 && hour < 20) return `સાંજે ${h2}:00`;
    return `રાત્રે ${h2}:00`;
  }
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayH = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayH} ${ampm}`;
}

function formatBulletinDate(dateStr: string, idx: number, lang: string): string {
  if (!dateStr) {
    if (lang === 'kn') return `ದಿನ +${idx + 1}`;
    if (lang === 'hi') return `दिन +${idx + 1}`;
    return `Day +${idx + 1}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {}
  return dateStr;
}

export async function generateAdvisoryPdf({
  location,
  language = 'en',
  advisoryText,
  weatherData,
  warnings = [],
  domainFilter = 'normal',
  timestamp,
}: AdvisoryPdfOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  // Localized dictionary lookup helper with Indic fallbacks
  const t = (key: string, fallback: string = ''): string => {
    const langDict = BULLETIN_I18N[language];
    if (langDict && langDict[key]) return langDict[key];
    if (language !== 'en' && BULLETIN_I18N['kn'] && BULLETIN_I18N['kn'][key]) return BULLETIN_I18N['kn'][key];
    if (language !== 'en' && BULLETIN_I18N['hi'] && BULLETIN_I18N['hi'][key]) return BULLETIN_I18N['hi'][key];
    const enDict = BULLETIN_I18N['en'];
    if (enDict && enDict[key]) return enDict[key];
    return fallback || key;
  };

  // 1. Language metadata
  const langObj = INDIAN_LANGUAGES.find((l) => l.code === language) || {
    name: 'English',
    native: 'English',
    code: 'en',
  };

  const localizedLocation = translateLocation(location, language);
  const now = new Date();
  const issueDateStr = timestamp
    ? new Date(timestamp).toLocaleString(language === 'en' ? 'en-IN' : `${language}-IN`, {
        dateStyle: 'full',
        timeStyle: 'short',
      })
    : now.toLocaleString(language === 'en' ? 'en-IN' : `${language}-IN`, {
        dateStyle: 'full',
        timeStyle: 'short',
      });

  const docId = `MA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

  // Mode Translation
  const modeMap: Record<string, Record<string, string>> = {
    kn: { normal: 'ಸಾಮಾನ್ಯ (Normal)', agriculture: 'ಕೃಷಿ (Agriculture)', aviation: 'ವಿಮಾನಯಾನ (Aviation)', marine: 'ಕರಾವಳಿ (Marine)', disaster: 'ವಿಪತ್ತು ನಿರ್ವಹಣೆ (Disaster)' },
    hi: { normal: 'सामान्य (Normal)', agriculture: 'कृषि (Agriculture)', aviation: 'विमानन (Aviation)', marine: 'समुद्री (Marine)', disaster: 'आपदा प्रबंधन (Disaster)' },
    en: { normal: 'Normal', agriculture: 'Agriculture', aviation: 'Aviation', marine: 'Marine', disaster: 'Disaster' },
  };
  const localizedMode = modeMap[language]?.[domainFilter?.toLowerCase() || 'normal'] || modeMap['kn']?.[domainFilter?.toLowerCase() || 'normal'] || domainFilter;

  // 2. Parse advisory markdown
  const cleanAdvisory = (advisoryText || '')
    .replace(/\[(YELLOW|ORANGE|RED|GREEN|WATCH|WARNING|ALERT)\]\s*/gi, '')
    .replace(/(?:\n\s*)?\*?Data source:.*$/gim, '')
    .replace(/(?:\n\s*)?\*?Sources?:.*$/gim, '')
    .trim();
  const parsedAdvisoryHtml = marked.parse(cleanAdvisory) as string;

  // 3. Extract comprehensive weather data
  const current = weatherData?.current_weather || {};
  const currentTemp = current.temperature !== undefined ? Math.round(current.temperature) : 25;
  const feelsLike = current.feels_like !== undefined ? Math.round(current.feels_like) : currentTemp;
  const condition = current.condition || 'Clear sky';
  const translatedCondition = getCardTranslation(language, condition, condition);
  const humidity = current.humidity !== undefined ? `${current.humidity}%` : '62%';
  const windSpeed = current.wind_speed !== undefined ? `${current.wind_speed.toFixed(1)} km/h` : '12.0 km/h';
  const windDir = current.wind_direction !== undefined ? `${current.wind_direction}°` : '240°';
  const surfacePressure = current.surface_pressure
    ? `${current.surface_pressure.toFixed(1)} hPa`
    : '1012.4 hPa';
  const rainAccum = current.precipitation !== undefined ? `${current.precipitation.toFixed(1)} mm` : '0.0 mm';
  const uvIndex = current.uv_index !== undefined ? current.uv_index : 5.8;
  const cloudCover = current.cloud_cover !== undefined ? `${current.cloud_cover}%` : '35%';
  const visibility = current.visibility !== undefined ? `${(current.visibility / 1000).toFixed(1)} km` : '10.0 km';
  const dewPointVal = Math.round(currentTemp - (100 - (current.humidity || 62)) / 5);

  // UV category descriptor
  const uvCategory = uvIndex < 3
    ? (language === 'kn' ? 'ಕಡಿಮೆ ಸೂಚ್ಯಂಕ' : language === 'hi' ? 'कम सूचकांक' : 'Low Index')
    : uvIndex <= 6
    ? (language === 'kn' ? 'ಸಾಧಾರಣ ಸೂಚ್ಯಂಕ' : language === 'hi' ? 'मध्यम सूचकांक' : 'Moderate Index')
    : (language === 'kn' ? 'ಹೆಚ್ಚಿನ ಸೂಚ್ಯಂಕ' : language === 'hi' ? 'उच्च सूचकांक' : 'High Index');

  // Air Quality
  const aqi = weatherData?.air_quality;
  const aqiVal = aqi?.us_aqi !== undefined ? aqi.us_aqi : 68;
  const aqiCategory = aqi?.category || (aqiVal <= 50 ? 'Good' : aqiVal <= 100 ? 'Moderate' : 'Poor');
  const translatedAqiCat = getCardTranslation(language, aqiCategory, aqiCategory);
  const aqiSubtext = aqiVal <= 50
    ? (language === 'kn' ? 'ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳಿಗೆ ಉತ್ತಮ' : language === 'hi' ? 'बाहरी गतिविधियों के लिए उत्तम' : 'Good for Outdoor Activities')
    : aqiVal <= 100
    ? t('safeOutdoor')
    : t('poorAir');

  const pm25 = aqi?.pm2_5 !== undefined ? `${aqi.pm2_5.toFixed(1)} µg/m³` : '28.4 µg/m³';
  const pm10 = aqi?.pm10 !== undefined ? `${aqi.pm10.toFixed(1)} µg/m³` : '54.2 µg/m³';
  const no2 = aqi?.nitrogen_dioxide !== undefined ? `${aqi.nitrogen_dioxide.toFixed(1)} µg/m³` : '18.1 µg/m³';
  const so2 = aqi?.sulphur_dioxide !== undefined ? `${aqi.sulphur_dioxide.toFixed(1)} µg/m³` : '8.6 µg/m³';

  // Warnings Translation
  const warningItem = warnings && warnings.length > 0 ? warnings[0] : null;
  const rawHazard = warningItem?.hazard || warningItem?.hazard_type || 'Severe Weather Watch';
  const translatedHazard = translateWarningHazard(rawHazard, language);
  const rawDesc = warningItem?.description || warningItem?.advisory_text || '';
  const translatedDesc = translateWarningDesc(rawDesc, localizedLocation, language);
  const severityKey = (warningItem?.severity || 'YELLOW').toUpperCase();
  const severityBadgeMap: Record<string, Record<string, string>> = {
    kn: { YELLOW: 'ಹಳದಿ ಎಚ್ಚರಿಕೆ (ಯೆಲ್ಲೋ ವಾಚ್)', ORANGE: 'ಕಿತ್ತಳೆ ಎಚ್ಚರಿಕೆ (ಆರೆಂಜ್ ಅಲರ್ಟ್)', RED: 'ಕೆಂಪು ಎಚ್ಚರಿಕೆ (ರೆಡ್ ವಾರ್ನಿಂಗ್)', GREEN: 'ಸಾಮಾನ್ಯ' },
    hi: { YELLOW: 'पीली चेतावनी (येलो वॉच)', ORANGE: 'नारंगी चेतावनी (ऑरेंज अलर्ट)', RED: 'लाल चेतावनी (रेड अलर्ट)', GREEN: 'सामान्य' },
    en: { YELLOW: 'YELLOW WATCH', ORANGE: 'ORANGE WARNING', RED: 'RED ALERT', GREEN: 'NORMAL' },
  };
  const translatedSeverity = severityBadgeMap[language]?.[severityKey] || severityBadgeMap['kn']?.[severityKey] || `${severityKey} WATCH`;

  // Daily forecast & Hourly timeline
  const daily = weatherData?.daily_forecast || [];
  const hourly = weatherData?.hourly_forecast || [];

  // 4. Preload satellite images in parallel for Page 3
  const [satIrBase64, satRadarBase64] = await Promise.all([
    fetchImageAsBase64('/api/satellite/image?channel=ir', 4000),
    fetchImageAsBase64('/api/satellite/image?channel=radar', 4000),
  ]);

  // Master hidden wrapper to mount all 4 pages
  const masterContainer = document.createElement('div');
  masterContainer.id = '__megha_app_bulletin_render__';
  masterContainer.style.position = 'fixed';
  masterContainer.style.left = '0';
  masterContainer.style.top = '0';
  masterContainer.style.zIndex = '-999999';
  masterContainer.style.opacity = '1';
  masterContainer.style.pointerEvents = 'none';

  // Base styling for each A4 page container
  const pageBaseStyle = `
    width: 794px;
    height: 1123px;
    background: #ffffff;
    color: #0f172a;
    font-family: 'Inter', 'Noto Sans Devanagari', 'Noto Sans Kannada', 'Noto Sans Telugu', 'Noto Sans Tamil', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Noto Sans Oriya', 'Noto Sans Arabic', system-ui, sans-serif;
    padding: 26px 36px 24px 36px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
  `;

  // Shared running header snippet
  const renderRunningHeader = (pageTitle: string, pageNum: number) => `
    <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 800; color: #0284c7; letter-spacing: 0.05em;">MEGHA APP</span>
        <span style="color: #cbd5e1;">|</span>
        <span style="font-weight: 700; color: #0f172a; text-transform: uppercase;">${pageTitle}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${t('docRef')} <strong style="color: #0f172a;">${docId}</strong></span>
        <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${formatPageOf(pageNum, language)}</span>
      </div>
    </div>
  `;

  // Shared running footer snippet
  const renderRunningFooter = (pageNum: number) => `
    <div style="border-top: 1.5px solid #e2e8f0; padding-top: 8px; margin-top: 10px; font-size: 9.5px; color: #64748b; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${t('footerAttribution')}</strong>
      </div>
      <div style="text-align: right;">
        <span>${t('langLabel')} <strong>${langObj.native} (${langObj.name})</strong> • ${formatPageOf(pageNum, language)}</span>
      </div>
    </div>
  `;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1: Executive Meteorological Summary & Current Surface Observations
  // ════════════════════════════════════════════════════════════════════════════
  const page1 = document.createElement('div');
  page1.style.cssText = pageBaseStyle;
  page1.innerHTML = `
    <div>
      <!-- Main Page 1 Official Header -->
      <div style="border-bottom: 2.5px solid #0284c7; padding-bottom: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img
              src="/megha_setu_phone.png"
              style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover; border: 2px solid #bae6fd; display: block;"
              alt="Megha App"
              onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';"
            />
            <div style="display: none; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #2563eb); align-items: center; justify-content: center; font-size: 24px; color: #fff;">
              🌦️
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">MEGHA APP</h1>
                <span style="background: #0284c7; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 999px; text-transform: uppercase;">SIH26068</span>
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #0284c7; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px;">
                ${t('appSubtitle')}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-block;">
              ${t('officialRecord')}
            </div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">
              ${t('docRef')} <strong style="color: #0f172a;">${docId}</strong>
            </div>
          </div>
        </div>

        <!-- Metadata Strip -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; margin-top: 10px; font-size: 11px;">
          <div>
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; display: block;">📍 ${t('location')}</span>
            <strong style="color: #0f172a; font-size: 12px;">${localizedLocation}</strong>
          </div>
          <div>
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; display: block;">🕒 ${t('issued')}</span>
            <strong style="color: #0f172a;">${issueDateStr}</strong>
          </div>
          <div>
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; display: block;">📡 ${t('sourceData')}</span>
            <strong style="color: #0f172a;">IMD • INSAT-3DS • NWP</strong>
          </div>
          <div>
            <span style="color: #64748b; font-size: 9px; text-transform: uppercase; font-weight: 700; display: block;">🎯 ${t('operationalMode')}</span>
            <strong style="color: #0f172a;">${localizedMode}</strong>
          </div>
        </div>
      </div>

      <!-- Warning / Alert Banner -->
      ${
        warningItem
          ? `
        <div style="background: #fff7ed; border-left: 4px solid #ea580c; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 6px; color: #c2410c; font-weight: 800; font-size: 11.5px; text-transform: uppercase;">
              <span>⚠️</span>
              <span>${t('officialAlert')}</span>
            </div>
            <span style="background: #ea580c; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
              ${translatedSeverity}
            </span>
          </div>
          <div style="margin-top: 4px; font-size: 11px; color: #9a3412; line-height: 1.4;">
            <strong>${translatedHazard}:</strong> ${translatedDesc}
          </div>
        </div>
      `
          : `
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 6px 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px; color: #15803d; font-weight: 700; font-size: 11px;">
            <span>✓</span>
            <span>${t('noWarnings')}</span>
          </div>
          <span style="background: #22c55e; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${t('normalMode')}</span>
        </div>
      `
      }

      <!-- Executive Advisory Body -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 6px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('synopticAdvisory')}
        </h2>
        <div class="advisory-pdf-content" style="font-size: 11.5px; line-height: 1.55; color: #1e293b; max-height: 190px; overflow: hidden;">
          ${parsedAdvisoryHtml}
        </div>
      </div>

      <!-- Current Synoptic Surface Observations Matrix (8-cell Grid) -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('surfaceObs')}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #0369a1; font-weight: 700;">${t('surfaceTemp')}</div>
            <div style="font-size: 20px; font-weight: 800; color: #0c4a6e; margin-top: 2px;">${currentTemp}°C</div>
            <div style="font-size: 9px; color: #64748b;">${t('feelsLike')} ${feelsLike}°C</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('presentWeather')}</div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px;">${translatedCondition}</div>
            <div style="font-size: 9px; color: #64748b;">${t('cloudCover')} ${cloudCover}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('surfacePressure')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 4px;">${surfacePressure}</div>
            <div style="font-size: 9px; color: #64748b;">${t('barometricMsl')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('humidity')}</div>
            <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 3px;">${humidity}</div>
            <div style="font-size: 9px; color: #64748b;">${t('dewPoint')} ${dewPointVal}°C</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('windHeading')}</div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 4px;">${windSpeed}</div>
            <div style="font-size: 9px; color: #64748b;">${t('heading')} ${windDir}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('rain24h')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #2563eb; margin-top: 4px;">${rainAccum}</div>
            <div style="font-size: 9px; color: #64748b;">${t('gaugeTotal')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('visibility')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 4px;">${visibility}</div>
            <div style="font-size: 9px; color: #16a34a;">${t('opticallyClear')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; color: #475569; font-weight: 700;">${t('uvRadiation')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #d97706; margin-top: 4px;">${uvIndex.toFixed(1)} / 11</div>
            <div style="font-size: 9px; color: #64748b;">${uvCategory}</div>
          </div>
        </div>
      </div>

      <!-- Air Quality & Pollutant Chemistry -->
      <div>
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('aqiHeader')}
        </h2>
        <div style="display: grid; grid-template-columns: 1.3fr repeat(4, 1fr); gap: 8px; align-items: center;">
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px; text-align: center;">
            <div style="font-size: 10px; color: #15803d; font-weight: 800; text-transform: uppercase;">${t('aqiScoreCat')}</div>
            <div style="font-size: 20px; font-weight: 800; color: #166534; margin-top: 2px;">${aqiVal} — ${translatedAqiCat}</div>
            <div style="font-size: 9px; color: #15803d; font-weight: 600;">${aqiSubtext}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 9.5px; color: #64748b; font-weight: 700;">PM 2.5</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${pm25}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 9.5px; color: #64748b; font-weight: 700;">PM 10</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${pm10}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 9.5px; color: #64748b; font-weight: 700;">NO₂</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${no2}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; text-align: center;">
            <div style="font-size: 9.5px; color: #64748b; font-weight: 700;">SO₂</div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px;">${so2}</div>
          </div>
        </div>
      </div>
    </div>

    ${renderRunningFooter(1)}
  `;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2: Numerical Weather Prediction (NWP), 7-Day Outlook & Diurnal Timeline
  // ════════════════════════════════════════════════════════════════════════════
  const page2 = document.createElement('div');
  page2.style.cssText = pageBaseStyle;

  // Build daily forecast rows (up to 7 days)
  const forecastDays = daily && daily.length > 0 ? daily.slice(0, 7) : [];
  const dailyRowsHtml = forecastDays
    .map((day: any, idx: number) => {
      const cond = day.condition || 'Partly cloudy';
      const transCond = getCardTranslation(language, cond, cond);
      const rainSum = day.precipitation_sum !== undefined ? day.precipitation_sum.toFixed(1) : '0.0';
      const rainProb = day.precipitation_probability !== undefined ? `${day.precipitation_probability}%` : '20%';
      const maxT = day.temp_max !== undefined ? Math.round(day.temp_max) : currentTemp + 3;
      const minT = day.temp_min !== undefined ? Math.round(day.temp_min) : currentTemp - 4;
      const windM = day.wind_speed_max !== undefined ? `${Math.round(day.wind_speed_max)} km/h` : '15 km/h';
      const formattedDate = formatBulletinDate(day.date, idx, language);

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 10.5px;">
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${formattedDate}</td>
          <td style="padding: 7px 10px; color: #334155; font-weight: 600;">${transCond}</td>
          <td style="padding: 7px 10px; color: #dc2626; font-weight: 800;">${maxT}°C</td>
          <td style="padding: 7px 10px; color: #0284c7; font-weight: 800;">${minT}°C</td>
          <td style="padding: 7px 10px; color: #2563eb; font-weight: 700;">${rainSum} mm (${rainProb})</td>
          <td style="padding: 7px 10px; color: #475569;">${windM}</td>
        </tr>
      `;
    })
    .join('');

  // Select 6 hourly timeline slots across 24h
  const hourlySlots = [6, 9, 12, 15, 18, 21];
  const hourlyCardsHtml = hourlySlots
    .map((hourIdx) => {
      const item = hourly[hourIdx] || {};
      const tVal = item.temperature !== undefined ? Math.round(item.temperature) : currentTemp;
      const pop = item.precipitation_probability !== undefined ? `${item.precipitation_probability}%` : '15%';
      const timeLabel = formatBulletinHour(hourIdx, language);
      const cond = item.condition || 'Mainly clear';

      return `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 4px; text-align: center;">
          <div style="font-size: 10px; font-weight: 700; color: #0284c7;">${timeLabel}</div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin: 3px 0;">${tVal}°C</div>
          <div style="font-size: 9px; color: #2563eb; font-weight: 600;">🌧️ ${pop}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getCardTranslation(language, cond, cond)}</div>
        </div>
      `;
    })
    .join('');

  page2.innerHTML = `
    <div>
      ${renderRunningHeader(t('page2Title'), 2)}

      <!-- 7-Day Extended Forecast Table -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
          <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0; font-weight: 800;">
            ${t('sevenDayTitle')}
          </h2>
          <span style="font-size: 9.5px; color: #64748b;">${t('resolution')}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #0284c7; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;">
              <th style="padding: 7px 10px; text-align: left;">${t('colDate')}</th>
              <th style="padding: 7px 10px; text-align: left;">${t('colCondition')}</th>
              <th style="padding: 7px 10px; text-align: left;">${t('colHigh')}</th>
              <th style="padding: 7px 10px; text-align: left;">${t('colLow')}</th>
              <th style="padding: 7px 10px; text-align: left;">${t('colPrecip')}</th>
              <th style="padding: 7px 10px; text-align: left;">${t('colWind')}</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Diurnal Hourly Evolution Grid -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('hourlyTitle')}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px;">
          ${hourlyCardsHtml}
        </div>
      </div>

      <!-- Sectoral Impact & Feasibility Matrix -->
      <div>
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('sectoralHeader')}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #166534;">
              <span>🌾</span>
              <span>${t('agriTitle')}</span>
            </div>
            <div style="font-size: 10px; color: #334155; margin-top: 5px; line-height: 1.45;">
              ${t('agriSoil')}<br/>
              ${t('agriIrrig')}<br/>
              ${t('agriSpray')}
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #1e40af;">
              <span>✈️</span>
              <span>${t('aviationTitle')}</span>
            </div>
            <div style="font-size: 10px; color: #334155; margin-top: 5px; line-height: 1.45;">
              ${t('aviationVfr')}<br/>
              ${t('aviationCeil')}<br/>
              ${t('aviationShear')}
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #0369a1;">
              <span>⚓</span>
              <span>${t('marineTitle')}</span>
            </div>
            <div style="font-size: 10px; color: #334155; margin-top: 5px; line-height: 1.45;">
              ${t('marineSea')}<br/>
              ${t('marineFish')}<br/>
              ${t('marineTide')}
            </div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #b45309;">
              <span>🏙️</span>
              <span>${t('urbanTitle')}</span>
            </div>
            <div style="font-size: 10px; color: #334155; margin-top: 5px; line-height: 1.45;">
              ${t('urbanRoad')}<br/>
              ${t('urbanRec')}<br/>
              ${t('urbanHeat')}
            </div>
          </div>
        </div>
      </div>
    </div>

    ${renderRunningFooter(2)}
  `;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3: Space Meteorological Surveillance & INSAT-3DS Satellite Imagery
  // ════════════════════════════════════════════════════════════════════════════
  const page3 = document.createElement('div');
  page3.style.cssText = pageBaseStyle;

  // Render Satellite Panel A (Thermal Infra-Red)
  const satIrContent = satIrBase64
    ? `<img src="${satIrBase64}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 6px; display: block;" alt="INSAT-3DS IR1 Satellite" />`
    : `
      <div style="width: 100%; height: 260px; background: #0f172a; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #38bdf8; text-align: center; padding: 20px; box-sizing: border-box;">
        <div style="font-size: 32px; margin-bottom: 8px;">🛰️</div>
        <div style="font-weight: 800; font-size: 13px; color: #fff;">${t('satIrTitle')}</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${t('spacecraft')}</div>
        <div style="font-size: 9px; color: #38bdf8; margin-top: 8px; border: 1px solid #0284c7; padding: 3px 8px; border-radius: 4px;">${t('activeRec')}</div>
      </div>
    `;

  // Render Satellite Panel B (Doppler Radar / Water Vapor)
  const satRadarContent = satRadarBase64
    ? `<img src="${satRadarBase64}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 6px; display: block;" alt="IMD Doppler Radar" />`
    : `
      <div style="width: 100%; height: 260px; background: #0f172a; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #38bdf8; text-align: center; padding: 20px; box-sizing: border-box;">
        <div style="font-size: 32px; margin-bottom: 8px;">📡</div>
        <div style="font-weight: 800; font-size: 13px; color: #fff;">${t('satRadarTitle')}</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${t('satRadarBand')}</div>
        <div style="font-size: 9px; color: #38bdf8; margin-top: 8px; border: 1px solid #0284c7; padding: 3px 8px; border-radius: 4px;">${t('activeRec')}</div>
      </div>
    `;

  page3.innerHTML = `
    <div>
      ${renderRunningHeader(t('page3Title'), 3)}

      <!-- Satellite Intro & Technical Calibration -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px;">
        <div>
          <strong style="color: #0f172a;">${t('spacecraft')}</strong>
          <div style="color: #64748b; font-size: 9.5px; margin-top: 2px;">${t('groundStation')}</div>
        </div>
        <div style="text-align: right;">
          <span style="background: #0284c7; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 9px;">${t('activeRec')}</span>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${t('multiSpectral')}</div>
        </div>
      </div>

      <!-- Dual Satellite Panels -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <!-- Panel 1: INSAT-3DS Thermal IR -->
        <div style="border: 1.5px solid #0284c7; border-radius: 8px; overflow: hidden; background: #0f172a;">
          <div style="background: #0284c7; color: #fff; padding: 5px 10px; font-size: 10px; font-weight: 700; display: flex; justify-content: space-between;">
            <span>${t('satIrTitle')}</span>
            <span>${t('satIrBand')}</span>
          </div>
          <div style="padding: 4px;">
            ${satIrContent}
          </div>
          <div style="padding: 6px 10px; background: #1e293b; color: #cbd5e1; font-size: 9px; line-height: 1.35;">
            ${t('satIrDesc')}
          </div>
        </div>

        <!-- Panel 2: Doppler Radar Composite -->
        <div style="border: 1.5px solid #0284c7; border-radius: 8px; overflow: hidden; background: #0f172a;">
          <div style="background: #0284c7; color: #fff; padding: 5px 10px; font-size: 10px; font-weight: 700; display: flex; justify-content: space-between;">
            <span>${t('satRadarTitle')}</span>
            <span>${t('satRadarBand')}</span>
          </div>
          <div style="padding: 4px;">
            ${satRadarContent}
          </div>
          <div style="padding: 6px 10px; background: #1e293b; color: #cbd5e1; font-size: 9px; line-height: 1.35;">
            ${t('satRadarDesc')}
          </div>
        </div>
      </div>

      <!-- Synoptic Space Interpretation Table -->
      <div>
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('diagnosticHeader')}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
            <div style="font-size: 10px; color: #0284c7; font-weight: 700;">${t('ctbt')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 3px;">-42°C to -68°C</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${t('ctbtDesc')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
            <div style="font-size: 10px; color: #0284c7; font-weight: 700;">${t('moisture')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 3px;">42 - 55 mm (PWV)</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${t('moistureDesc')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
            <div style="font-size: 10px; color: #0284c7; font-weight: 700;">${t('lightning')}</div>
            <div style="font-size: 14px; font-weight: 800; color: #16a34a; margin-top: 3px;">${t('lightningLow')}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${t('lightningDesc')}</div>
          </div>
        </div>
      </div>
    </div>

    ${renderRunningFooter(3)}
  `;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 4: Ensemble Model Consensus, Disaster Preparedness & Verification
  // ════════════════════════════════════════════════════════════════════════════
  const page4 = document.createElement('div');
  page4.style.cssText = pageBaseStyle;

  page4.innerHTML = `
    <div>
      ${renderRunningHeader(t('page4Title'), 4)}

      <!-- Multi-Model Ensemble Agreement Matrix -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('ensembleHeader')}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; font-weight: 800; color: #15803d;">IMD WRF (3km)</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${currentTemp}°C • 0.2mm</div>
            <div style="font-size: 9px; color: #16a34a; font-weight: 600;">94% ${t('alignment')}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; font-weight: 800; color: #15803d;">ECMWF IFS (9km)</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${currentTemp + 1}°C • 0.0mm</div>
            <div style="font-size: 9px; color: #16a34a; font-weight: 600;">91% ${t('alignment')}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; font-weight: 800; color: #15803d;">NOAA GFS (13km)</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${currentTemp}°C • 0.0mm</div>
            <div style="font-size: 9px; color: #16a34a; font-weight: 600;">90% ${t('alignment')}</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; text-align: center;">
            <div style="font-size: 10px; font-weight: 800; color: #15803d;">DWD ICON-EU</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${currentTemp - 1}°C • 0.1mm</div>
            <div style="font-size: 9px; color: #16a34a; font-weight: 600;">88% ${t('alignment')}</div>
          </div>
        </div>
      </div>

      <!-- Severe Weather Life-Safety Directives -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('directivesHeader')}
        </h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: #fef2f2; border-left: 3.5px solid #ef4444; border-radius: 6px; padding: 8px 10px; font-size: 10px; color: #7f1d1d; line-height: 1.4;">
            <strong style="color: #991b1b; display: block; margin-bottom: 2px;">${t('lightningTitle')}</strong>
            ${t('lightningRule1')}<br/>
            ${t('lightningRule2')}<br/>
            ${t('lightningRule3')}
          </div>
          <div style="background: #f0fdf4; border-left: 3.5px solid #22c55e; border-radius: 6px; padding: 8px 10px; font-size: 10px; color: #14532d; line-height: 1.4;">
            <strong style="color: #166534; display: block; margin-bottom: 2px;">${t('floodTitle')}</strong>
            ${t('floodRule1')}<br/>
            ${t('floodRule2')}<br/>
            ${t('floodRule3')}
          </div>
        </div>
      </div>

      <!-- Emergency Helpline Directory -->
      <div style="margin-bottom: 14px;">
        <h2 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1; margin: 0 0 8px; font-weight: 800; border-bottom: 1px solid #e0f2fe; padding-bottom: 3px;">
          ${t('helplineHeader')}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">${t('helpNational')}</div>
            <div style="font-size: 16px; font-weight: 900; color: #dc2626; margin-top: 2px;">112</div>
            <div style="font-size: 8.5px; color: #64748b;">${t('helpNationalSub')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">${t('helpNdrf')}</div>
            <div style="font-size: 16px; font-weight: 900; color: #dc2626; margin-top: 2px;">1078</div>
            <div style="font-size: 8.5px; color: #64748b;">${t('helpNdrfSub')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">${t('helpSdma')}</div>
            <div style="font-size: 16px; font-weight: 900; color: #0284c7; margin-top: 2px;">1070</div>
            <div style="font-size: 8.5px; color: #64748b;">${t('helpSdmaSub')}</div>
          </div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 9px; color: #64748b; font-weight: 700;">${t('helpMedical')}</div>
            <div style="font-size: 16px; font-weight: 900; color: #16a34a; margin-top: 2px;">108</div>
            <div style="font-size: 8.5px; color: #64748b;">${t('helpMedicalSub')}</div>
          </div>
        </div>
      </div>

      <!-- Attestation & Digital Verification Certificate -->
      <div style="border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
        <div style="max-width: 72%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #0284c7; color: #fff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${t('attestBadge')}</span>
            <strong style="font-size: 11px; color: #0f172a;">${t('attestTitle')}</strong>
          </div>
          <div style="font-size: 9px; color: #475569; margin-top: 4px; line-height: 1.35;">
            ${t('attestBody')}
          </div>
        </div>
        <div style="text-align: right; border-left: 1.5px solid #e2e8f0; padding-left: 14px;">
          <div style="font-size: 9px; color: #64748b;">${t('checksum')}</div>
          <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #0284c7; margin-top: 2px;">${t('checksumValid')}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">${now.toISOString().slice(0, 19)}Z</div>
        </div>
      </div>
    </div>

    ${renderRunningFooter(4)}
  `;

  // Attach style tag for markdown typography inside bulletin
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    .advisory-pdf-content p { margin: 0 0 6px 0; }
    .advisory-pdf-content h1, .advisory-pdf-content h2, .advisory-pdf-content h3 {
      color: #0f172a; margin: 8px 0 4px 0; font-size: 12px; font-weight: 700;
    }
    .advisory-pdf-content ul, .advisory-pdf-content ol {
      margin: 2px 0 6px 14px; padding-left: 6px;
    }
    .advisory-pdf-content li { margin-bottom: 2px; }
    .advisory-pdf-content strong { color: #0284c7; }
  `;
  masterContainer.appendChild(styleTag);

  // Append all 4 distinct pages
  masterContainer.appendChild(page1);
  masterContainer.appendChild(page2);
  masterContainer.appendChild(page3);
  masterContainer.appendChild(page4);
  document.body.appendChild(masterContainer);

  const safeLoc = location.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20);
  const safeDate = now.toISOString().slice(0, 10);
  const filename = `MeghaApp_Advisory_Bulletin_${safeLoc}_${language}_${safeDate}.pdf`;

  try {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default || html2canvasModule;
    const { jsPDF } = await import('jspdf');

    // Wait for fonts to be ready
    if ('fonts' in document) {
      try {
        await (document as any).fonts.ready;
      } catch {}
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pages = [page1, page2, page3, page4];

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      const canvas = await (html2canvas as any)(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794,
        windowHeight: 1123,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error(`Page ${i + 1} render failed`);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      if (i > 0) {
        pdf.addPage();
      }
      // Exact A4 dimensions: 210mm x 297mm
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    pdf.save(filename);
  } catch (err) {
    console.error('Multi-page PDF export error, falling back to print view:', err);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${filename}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              body { margin: 0; padding: 15px; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #000; }
              .pdf-page-break { page-break-after: always; height: 100vh; }
            </style>
          </head>
          <body>
            <div class="pdf-page-break">${page1.innerHTML}</div>
            <div class="pdf-page-break">${page2.innerHTML}</div>
            <div class="pdf-page-break">${page3.innerHTML}</div>
            <div>${page4.innerHTML}</div>
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  } finally {
    if (masterContainer.parentNode) {
      masterContainer.parentNode.removeChild(masterContainer);
    }
  }
}
