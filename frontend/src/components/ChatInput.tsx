'use client';

import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { getTranslation, getModernLandingStrings } from '../i18n/translations';
import styles from './ChatInput.module.css';
import { DomainMode, DomainModeId } from '../types/chat';
import { useTheme } from '../theme/ThemeProvider';
import { ThinkingOrb } from 'thinking-orbs';
import { BorderBeam } from 'border-beam';
import { VoiceBeam, useMicrophone } from 'voice-glow';

const DOMAIN_MODES: DomainMode[] = [
  { id: 'normal', icon: '🏙️', nameKey: 'modes.normal', label: 'City', desc: 'Urban weather, daily commutes & rain updates' },
  { id: 'agriculture', icon: '🌾', nameKey: 'modes.agriculture', label: 'AgriSense', desc: 'Crop advisory, irrigation & spraying guidance' },
  { id: 'aviation', icon: '✈️', nameKey: 'modes.aviation', label: 'SkyOps', desc: 'Visibility, cloud base, wind shear & METAR briefing' },
  { id: 'marine', icon: '⚓', nameKey: 'modes.marine', label: 'SeaCast', desc: 'Coastal winds, wave heights & sea-state outlook' },
  { id: 'research', icon: '📊', nameKey: 'modes.research', label: 'Climate X', desc: 'Historical anomalies, baseline trends & climate analysis' },
];

function getBcp47Lang(code: string): string {
  const map: Record<string, string> = {
    hi: 'hi-IN',
    bn: 'bn-IN',
    te: 'te-IN',
    mr: 'mr-IN',
    ta: 'ta-IN',
    ur: 'ur-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    or: 'or-IN',
    pa: 'pa-IN',
    as: 'as-IN',
    en: 'en-IN',
  };
  return map[code] || 'en-IN';
}

export interface ChatInputProps {
  onSend: (query: string) => void;
  loading: boolean;
  language?: string;
  domainFilter?: DomainModeId | string;
  onDomainChange?: (domain: DomainModeId | string) => void;
  onOpenSatellite?: () => void;
  onOpenSos?: () => void;
  isHero?: boolean;
  onListeningChange?: (listening: boolean) => void;
}

export default function ChatInput({
  onSend,
  loading,
  language = 'en',
  domainFilter = 'normal',
  onDomainChange,
  onOpenSatellite,
  onOpenSos,
  isHero = false,
  onListeningChange,
}: ChatInputProps) {
  const [query, setQuery] = useState('');
  const [recording, setRecording] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const mic = useMicrophone();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isLive = recording || mic.state === 'live';

  useEffect(() => {
    onListeningChange?.(isLive);
  }, [isLive, onListeningChange]);

  const [mounted, setMounted] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [modeGlow, setModeGlow] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    width: number;
    maxHeight?: number;
    openUpward: boolean;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const baseTextRef = useRef<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    if (!modeMenuRef.current) return;
    const rect = modeMenuRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceAbove >= 260 || spaceAbove >= spaceBelow;
    const right = Math.max(12, window.innerWidth - rect.right);
    const width = Math.min(290, window.innerWidth - 24);
    const maxHeight = openUp ? Math.min(320, spaceAbove - 16) : Math.min(320, spaceBelow - 16);

    setMenuPosition({
      top: openUp ? undefined : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
      right,
      width,
      maxHeight,
      openUpward: openUp,
    });
  };

  const toggleModeMenu = () => {
    setShowModeMenu((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(updateMenuPosition, 0);
      }
      return next;
    });
  };

  // Close mode menu on outside click and update on scroll/resize
  useEffect(() => {
    if (!showModeMenu) return;
    updateMenuPosition();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowModeMenu(false);
      }
    };

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [showModeMenu]);

  const activeMode = DOMAIN_MODES.find((m) => m.id === domainFilter) || DOMAIN_MODES[0];
  const activeModeName = language === 'en' ? activeMode.label : (getTranslation(language, activeMode.nameKey) || activeMode.label);
  const placeholder = getTranslation(language, 'inputPlaceholder', 'Ask Megha App…');

  const handleModeSelect = (id: DomainModeId) => {
    onDomainChange?.(id);
    setShowModeMenu(false);
    setModeGlow(true);
    setTimeout(() => setModeGlow(false), 1200);
  };

  const handleSend = () => {
    const q = query.trim();
    if (!q || loading) return;
    if (isLive) {
      mic.stop();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      setRecording(false);
    }
    onSend(q);
    setQuery('');
    baseTextRef.current = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    baseTextRef.current = e.target.value.trim();
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // Robust Native Web Speech Recognition with Audio Fallback and voice-glow stream
  const handleVoice = async () => {
    if (typeof window === 'undefined') return;

    if (isLive) {
      mic.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
      return;
    }

    // Preserve whatever text is already in the input box so the user continues seamlessly
    baseTextRef.current = query.trim();

    // Start mic to provide sound-reactive MediaStream to VoiceBeam
    try {
      await mic.start();
    } catch (err) {
      console.warn('mic.start error:', err);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        // Enable continuous recognition to prevent abrupt cut-offs when pausing
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = getBcp47Lang(language);

        recognition.onstart = () => {
          setRecording(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const sessionTranscript = (finalTranscript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();
          const base = baseTextRef.current;
          const fullText = base ? (sessionTranscript ? `${base} ${sessionTranscript}` : base) : sessionTranscript;

          if (fullText) {
            setQuery(fullText);
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
              textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setRecording(false);
          mic.stop();
          if (event.error === 'not-allowed') {
            alert('Microphone permission was denied. Please allow microphone access in your browser settings.');
          } else if (event.error !== 'no-speech') {
            fallbackMediaRecorder();
          }
        };

        recognition.onend = () => {
          setRecording(false);
          mic.stop();
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn('Native speech recognition failed, trying MediaRecorder:', err);
      }
    }

    fallbackMediaRecorder();
  };

  const fallbackMediaRecorder = async () => {
    try {
      let stream = mic.stream;
      if (!stream) {
        if (!navigator.mediaDevices?.getUserMedia) {
          alert('Microphone is not supported in this browser environment.');
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        mic.stop();
        const blob = new Blob(chunks, { type: 'audio/webm' });

        try {
          const res = await fetch(`/api/transcribe?language=${encodeURIComponent(language)}`, {
            method: 'POST',
            body: blob,
            headers: { 'Content-Type': 'audio/webm' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              const base = baseTextRef.current;
              const newText = base ? `${base} ${data.text.trim()}` : data.text.trim();
              setQuery(newText);
              baseTextRef.current = newText;
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                textareaRef.current.focus();
              }
            }
          }
        } catch (e) {
          console.warn('Server transcription error:', e);
        }
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
      // Automatically stop after 7 seconds max
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 7000);
    } catch (err) {
      console.warn('Could not access microphone:', err);
      setRecording(false);
      mic.stop();
      alert('Please grant microphone permission to use voice input.');
    }
  };

  const { colorScheme } = useTheme();
  const isAeroMarine = domainFilter === 'aviation' || domainFilter === 'marine';
  const beamTheme = colorScheme === 'dark' ? 'dark' : 'light';
  const beamRadius = isHero ? 9999 : 28;

  const inputCard = (
    <div className={`${styles.inputContainer} ${isHero ? styles.inputContainerHero : ''} ${modeGlow ? styles.containerGlow : ''}`}>
      {/* Top input row */}
      <div className={styles.topRow}>
        {/* Auto-expanding textarea */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={styles.textarea}
          rows={1}
          disabled={loading}
          aria-label="Type your weather question"
          id="chat-input"
        />

        {/* Right controls: Mode selector pill & Microphone */}
        <div className={styles.rightControls}>
          {/* Mode Picker Pill */}
          <div className={styles.modeWrapper} ref={modeMenuRef}>
            <button
              type="button"
              className={`${styles.modePill} ${modeGlow ? styles.modePillAnimated : ''}`}
              onClick={toggleModeMenu}
              aria-label="Change intelligence domain mode"
              aria-expanded={showModeMenu}
              title="Switch intelligence mode (City, Agriculture, Aviation, Marine, Research)"
            >
              <span className={styles.modeIcon}>{activeMode.icon}</span>
              <span className={styles.modeName}>{activeModeName}</span>
              <span className={styles.modeChevron}>{showModeMenu ? '▴' : '▾'}</span>
            </button>

            {/* Mode Dropdown Menu (Portaled into document.body to avoid clipping by BorderBeam / VoiceBeam) */}
            {showModeMenu && mounted && menuPosition && typeof document !== 'undefined' && createPortal(
              <div
                ref={dropdownRef}
                className={`${styles.modeDropdown} ${styles.modeDropdownPortal} ${
                  menuPosition.openUpward ? styles.modeDropdownUpPortal : styles.modeDropdownDownPortal
                }`}
                style={{
                  top: menuPosition.top !== undefined ? `${menuPosition.top}px` : 'auto',
                  bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : 'auto',
                  right: `${menuPosition.right}px`,
                  width: `${menuPosition.width}px`,
                  maxHeight: menuPosition.maxHeight ? `${menuPosition.maxHeight}px` : undefined,
                }}
                role="menu"
              >
                <div className={styles.dropdownHeader}>Select Domain Mode</div>
                {DOMAIN_MODES.map((mode) => {
                  const isSelected = domainFilter === mode.id;
                  const localizedName = mode.label || getTranslation(language, mode.nameKey, mode.id);

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      className={`${styles.modeOption} ${isSelected ? styles.modeOptionActive : ''}`}
                      onClick={() => handleModeSelect(mode.id)}
                      role="menuitem"
                    >
                      <span className={styles.optIcon}>{mode.icon}</span>
                      <div className={styles.optInfo}>
                        <span className={styles.optName}>{localizedName}</span>
                        <span className={styles.optDesc}>{mode.desc}</span>
                      </div>
                      {isSelected && <span className={styles.optCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>,
              document.body
            )}
          </div>

          {/* Microphone Button with ThinkingOrb animation */}
          <button
            type="button"
            className={`${styles.actionBtn} ${isLive ? styles.actionBtnActive : ''}`}
            onClick={handleVoice}
            aria-label={isLive ? 'Stop listening' : 'Start voice input'}
            title={isLive ? 'Listening… click to stop' : 'Voice Input (all languages)'}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isLive ? (
              <ThinkingOrb
                state="listening"
                size={20}
                theme={colorScheme === 'dark' ? 'dark' : 'light'}
              />
            ) : (
              <MicIcon />
            )}
          </button>

          {/* Send Button with ThinkingOrb animation */}
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.sendBtn} ${query.trim() ? styles.sendBtnReady : ''}`}
            onClick={handleSend}
            disabled={loading || !query.trim()}
            aria-label="Send message"
            title="Send (Enter)"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? (
              <ThinkingOrb
                state="working"
                size={20}
                theme={colorScheme === 'dark' ? 'dark' : 'light'}
              />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${styles.wrapper} ${isHero ? styles.wrapperHero : ''}`}>
      {mounted ? (
        <VoiceBeam
          stream={mic.stream}
          processing={loading}
          type={isMobile ? 'mobile' : 'default'}
          colorVariant="colorful"
          theme={beamTheme}
          active={isLive || loading}
          borderRadius={beamRadius}
          className={styles.beamWrapper}
        >
          <BorderBeam
            size="md"
            colorVariant="colorful"
            strength={0.7}
            theme={beamTheme}
            active={!isLive}
            borderRadius={beamRadius}
            className={styles.beamWrapper}
          >
            {inputCard}
          </BorderBeam>
        </VoiceBeam>
      ) : (
        <div className={styles.beamWrapper}>
          {inputCard}
        </div>
      )}

      {!isHero && (
        <div className={styles.hintRow}>
          <span>Shift+Enter for new line</span>
          <span>22 Indian Languages • Live Meteorological Intelligence</span>
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="20" x2="12" y2="24" />
      <line x1="8" y1="24" x2="16" y2="24" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

