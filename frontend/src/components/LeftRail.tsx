import React, { useState } from 'react';
import styles from './LeftRail.module.css';
import { getTranslation } from '../i18n/translations';
import { UserProfile } from '../types/chat';
import { useTheme } from '../theme/ThemeProvider';
import { api } from '../api/client';

export const DOMAIN_MODES = [
  { id: 'normal', icon: '🏙️', label: 'City', desc: 'Urban weather & rain updates' },
  { id: 'agriculture', icon: '🌾', label: 'AgriSense', desc: 'Crop advisory & irrigation' },
  { id: 'aviation', icon: '✈️', label: 'SkyOps', desc: 'Visibility & METAR briefing' },
  { id: 'marine', icon: '⚓', label: 'SeaCast', desc: 'Coastal winds & wave heights' },
  { id: 'research', icon: '🔬', label: 'Climate X', desc: 'Historical anomalies & climate' },
];

export interface LeftRailProps {
  onNewChat: () => void;
  onToggleHistory: () => void;
  onOpenSatellite: () => void;
  onOpenWarnings: () => void;
  onOpenLanguage: () => void;
  onProfileClick: () => void;
  user?: UserProfile | null;
  language?: string;
  hasWarnings?: boolean;
  isHistoryOpen?: boolean;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  onOpenMobileDrawer?: () => void;
  domainFilter?: string;
  onDomainChange?: (modeId: string) => void;
  onOpenDownload?: () => void;
}

export default function LeftRail({
  onNewChat,
  onToggleHistory,
  onOpenSatellite,
  onOpenWarnings,
  onOpenLanguage,
  onProfileClick,
  user,
  language = 'en',
  hasWarnings = false,
  isHistoryOpen = false,
  isMobileDrawerOpen = false,
  onCloseMobileDrawer,
  onOpenMobileDrawer,
  domainFilter = 'normal',
  onDomainChange,
  onOpenDownload,
}: LeftRailProps) {
  const { colorScheme, setColorScheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const currentModeObj = DOMAIN_MODES.find((m) => m.id === domainFilter) || DOMAIN_MODES[0];

  return (
    <>
      {/* Desktop & Tablet Placeholder so layout doesn't jump when rail expands on hover */}
      <div className={styles.railPlaceholder} aria-hidden="true" />

      {/* Desktop & Tablet Navigation Rail (Expands on Hover in Laptop/Desktop) */}
      <aside
        className={`${styles.rail} ${isHovered ? styles.railExpanded : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main Navigation"
      >
        {/* Top Section */}
        <div className={styles.topGroup}>
          {/* MEGHA SETU Brand Logo with gentle micro-animation */}
          <div className={styles.logoBtn} onClick={onNewChat} title="MEGHA SETU — Home" aria-label="MEGHA SETU Home">
            <img
              src="/megha_setu_icon.png"
              alt="MEGHA SETU"
              className={styles.logoImg}
            />
            <div className={styles.logoTextWrapper}>
              <span className={styles.brandTitle}>MEGHA SETU</span>
              <span className={styles.brandTagline}>Weather GPT</span>
            </div>
          </div>

          {/* New Chat */}
          <button
            type="button"
            className={styles.railBtn}
            onClick={onNewChat}
            title={getTranslation(language, 'newChat', 'New chat')}
            aria-label="New chat"
          >
            <span className={styles.btnIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className={styles.btnLabel}>{getTranslation(language, 'newChat', 'New chat')}</span>
          </button>

          {/* Android Application Download & Upcoming Features */}
          <button
            type="button"
            className={`${styles.railBtn} ${styles.apkDownloadRailBtn}`}
            onClick={onOpenDownload}
            title="Megha Setu for Android • Application Preview"
            aria-label="Megha Setu for Android Application"
            id="nav-download-app-btn"
          >
            <span className={styles.btnIcon} style={{ fontSize: '1.18rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className={styles.apkPulseGlow} />
            </span>
            <span className={styles.btnLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>Download App</span>
              <span className={styles.apkPillBadge}>Soon 🚀</span>
            </span>
          </button>

          {/* Chat History */}
          <button
            type="button"
            className={`${styles.railBtn} ${isHistoryOpen ? styles.railBtnActive : ''}`}
            onClick={onToggleHistory}
            title={getTranslation(language, 'history', 'Chat history')}
            aria-label="Chat history"
          >
            <span className={styles.btnIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className={styles.btnLabel}>{getTranslation(language, 'history', 'Chat history')}</span>
          </button>

          {/* Live Warnings */}
          <button
            type="button"
            className={`${styles.railBtn} ${hasWarnings ? styles.railBtnWarning : ''}`}
            onClick={onOpenWarnings}
            title={getTranslation(language, 'disasterAlert', 'Disaster & Weather Warnings')}
            aria-label="Disaster warnings"
          >
            <span className={styles.btnIcon} style={{ fontSize: '1.15rem' }}>
              ⚠️
              {hasWarnings && <span className={styles.warningDot} />}
            </span>
            <span className={styles.btnLabel}>
              {getTranslation(language, 'disasterAlert', 'Live Warnings')}
            </span>
            {hasWarnings && <span className={styles.expandedBadge}>Alert</span>}
          </button>

          {/* 22 Indian Languages */}
          <button
            type="button"
            className={styles.railBtn}
            onClick={onOpenLanguage}
            title="22 Indian Languages + English"
            aria-label="Language selector"
          >
            <span className={styles.btnIcon} style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {language.toUpperCase().slice(0, 2)}
            </span>
            <span className={styles.btnLabel}>Languages ({language.toUpperCase()})</span>
          </button>
        </div>

        {/* Bottom Section: Settings & User Profile */}
        <div className={styles.bottomGroup}>

          {/* Theme Mode Toggle (Dark / Light) */}
          <button
            type="button"
            className={styles.railBtn}
            onClick={() => {
              const next = colorScheme === 'dark' ? 'light' : 'dark';
              setColorScheme(next);
              if (user) api.patch('/api/user', { color_scheme: next }).catch(() => {});
            }}
            title={colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark / Light Mode"
          >
            <span className={styles.btnIcon} style={{ fontSize: '1.15rem' }}>
              {colorScheme === 'dark' ? '☀️' : '🌙'}
            </span>
            <span className={styles.btnLabel}>
              {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* User Profile Avatar (at the very bottom left) */}
          <button
            type="button"
            className={styles.profileAvatarBtn}
            onClick={onProfileClick}
            title={user?.name || 'Account & Profile'}
            aria-label="User Account"
            id="profile-menu-trigger"
          >
            <span className={styles.btnIcon}>
              {user ? (
                <img
                  src={user.avatar_url || '/default-avatar.png'}
                  alt={user.name || 'User'}
                  className={styles.avatarImg}
                  style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
              ) : (
                <div className={styles.avatarFallback}>
                  <span>👤</span>
                </div>
              )}
            </span>
            <span className={styles.btnLabel} style={{ fontWeight: 600 }}>
              {user?.name || 'Account'}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer Navigation (When hamburger is clicked on phones) */}
      {isMobileDrawerOpen && (
        <>
          <div
            className={styles.mobileBackdrop}
            onClick={onCloseMobileDrawer}
            aria-hidden="true"
          />
          <nav
            className={styles.mobileDrawer}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <div className={styles.mobileDrawerHeader}>
              <div className={styles.mobileBrand}>
                <img
                  src="/megha_setu_phone.png"
                  alt="MEGHA SETU"
                  style={{ height: 36, width: 'auto', objectFit: 'contain' }}
                />
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={onCloseMobileDrawer}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className={styles.mobileMenuItems}>
              {/* Minimal New Chat Pill */}
              <button
                type="button"
                className={styles.mobileNewChatBtn}
                onClick={() => {
                  onNewChat?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>＋</span>
                <span>{getTranslation(language, 'newChat', 'New chat')}</span>
              </button>

              {/* Android Application Download Card */}
              <button
                type="button"
                className={styles.mobileApkBtn}
                onClick={() => {
                  onOpenDownload?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Application</span>
                </div>
                <span className={styles.apkPillBadge}>GET APP ⚡</span>
              </button>

              {/* Intelligence Domain Modes */}
              <div className={styles.drawerSection}>
                <div className={styles.drawerSectionHeader}>
                  <span>INTELLIGENCE MODES</span>
                  {currentModeObj && (
                    <span className={styles.drawerActiveDomainBadge}>
                      {currentModeObj.icon} {currentModeObj.label}
                    </span>
                  )}
                </div>
                <div className={styles.drawerModesList}>
                  {DOMAIN_MODES.map((mode) => {
                    const isSel = domainFilter === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        className={`${styles.drawerModeBtn} ${isSel ? styles.drawerModeBtnActive : ''}`}
                        onClick={() => {
                          onDomainChange?.(mode.id);
                          onCloseMobileDrawer?.();
                        }}
                      >
                        <span className={styles.drawerModeIcon}>{mode.icon}</span>
                        <div className={styles.drawerModeInfo}>
                          <div className={styles.drawerModeHeaderRow}>
                            <span className={styles.drawerModeTitle}>{mode.label}</span>
                            {isSel && <span className={styles.drawerModeActivePill}>ACTIVE</span>}
                          </div>
                          <span className={styles.drawerModeDesc}>{mode.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.drawerDivider} />

              {/* Chat History */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  onToggleHistory?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>💬</span>
                <span className={styles.itemLabel}>{getTranslation(language, 'history', 'Chat history')}</span>
              </button>

              {/* Live Warnings */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  onOpenWarnings?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>⚠️</span>
                <span className={styles.itemLabel}>
                  {getTranslation(language, 'disasterAlert', 'Disaster & Weather Warnings')}
                </span>
                {hasWarnings && <span className={styles.mobileBadge}>Alert</span>}
              </button>

              {/* 22 Languages */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  onOpenLanguage?.();
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>🌐</span>
                <span className={styles.itemLabel}>
                  Languages ({language.toUpperCase()})
                </span>
              </button>

              {/* Theme Mode Toggle (Dark / Light) */}
              <button
                type="button"
                className={styles.mobileMenuItem}
                onClick={() => {
                  const next = colorScheme === 'dark' ? 'light' : 'dark';
                  setColorScheme(next);
                  if (user) api.patch('/api/user', { color_scheme: next }).catch(() => {});
                  onCloseMobileDrawer?.();
                }}
              >
                <span className={styles.itemIcon}>{colorScheme === 'dark' ? '☀️' : '🌙'}</span>
                <span className={styles.itemLabel}>
                  Theme: {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
                <span className={styles.mobileBadge} style={{ background: 'var(--badge-bg)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
                  {colorScheme.toUpperCase()}
                </span>
              </button>
            </div>

            {/* User Profile at Bottom of Mobile Drawer */}
            <div className={styles.mobileDrawerFooter}>
              <button
                type="button"
                className={styles.mobileProfileBtn}
                onClick={() => {
                  onProfileClick?.();
                  onCloseMobileDrawer?.();
                }}
              >
                {user ? (
                  <img
                    src={user.avatar_url || '/default-avatar.png'}
                    alt=""
                    className={styles.mobileAvatarImg}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
                    }}
                  />
                ) : (
                  <div className={styles.mobileAvatarFallback}>
                    <span>👤</span>
                  </div>
                )}
                <div className={styles.mobileProfileInfo}>
                  <span className={styles.mobileUserName}>{user?.name || 'Account & Profile'}</span>
                  <span className={styles.mobileUserEmail}>{user?.email || 'Sign in with Google'}</span>
                </div>
              </button>
            </div>
          </nav>
        </>
      )}
    </>
  );
}
