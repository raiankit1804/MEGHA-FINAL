'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ThemeContextType {
  interfaceStyle: string;
  setInterfaceStyle: (style: string) => void;
  colorScheme: string;
  setColorScheme: (scheme: string) => void;
  themeKey: string;
  triggerModernFlash: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Only minimal view is supported, with dark and light modes
  const interfaceStyle = 'minimal';
  const [colorScheme, setColorSchemeState] = useState<string>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const savedColor = localStorage.getItem('wgpt_color') || 'dark';
    setColorSchemeState(savedColor);
    setMounted(true);
  }, []);

  const setInterfaceStyle = (_style: string) => {
    // Only minimal view is active
  };

  const triggerModernFlash = () => {
    // No-op since modern view is removed
  };

  const setColorScheme = (scheme: string) => {
    const valid = scheme === 'light' ? 'light' : 'dark';
    setColorSchemeState(valid);
  };

  const themeKey = `minimal-${colorScheme}`;

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', themeKey);
    document.documentElement.setAttribute('data-color-mode', colorScheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(colorScheme);
    localStorage.setItem('wgpt_color', colorScheme);
    localStorage.setItem('wgpt_interface', 'minimal');
  }, [themeKey, colorScheme, mounted]);

  return (
    <ThemeContext.Provider
      value={{
        interfaceStyle,
        setInterfaceStyle,
        colorScheme,
        setColorScheme,
        themeKey,
        triggerModernFlash,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

