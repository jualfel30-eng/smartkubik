'use client';

import { useEffect } from 'react';

interface ThemeColors {
  [key: string]: string;
}

interface ThemeFonts {
  primary?: string;
}

interface Theme {
  colors: ThemeColors;
  fonts?: ThemeFonts;
}

interface ThemeProviderProps {
  theme: Theme;
  children: React.ReactNode;
}

export default function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    // Aplicar CSS variables del tema
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });

    if (theme.fonts?.primary) {
      root.style.setProperty('--font-primary', theme.fonts.primary);
    }
  }, [theme]);

  return <>{children}</>;
}
