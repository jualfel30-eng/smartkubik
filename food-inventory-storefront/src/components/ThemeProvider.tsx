'use client';

import { useEffect } from 'react';

interface ThemeColors {
  [key: string]: string;
}

interface ThemeFonts {
  primary?: string;
}

interface Theme {
  colors?: ThemeColors;
  primaryColor?: string;
  secondaryColor?: string;
  fonts?: ThemeFonts;
  fontFamily?: string;
}

interface ThemeProviderProps {
  theme?: Theme;
  children: React.ReactNode;
}

export default function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    if (!theme) return;

    // Aplicar CSS variables del tema
    const root = document.documentElement;
    
    // Soporte para estructura antigua (colors object)
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value as string);
      });
    }
    
    // Soporte para estructura nueva (primaryColor, secondaryColor)
    if (theme.primaryColor) {
      root.style.setProperty('--color-primary', theme.primaryColor);
    }
    
    if (theme.secondaryColor) {
      root.style.setProperty('--color-secondary', theme.secondaryColor);
    }

    // Aplicar fuentes
    if (theme.fonts?.primary) {
      root.style.setProperty('--font-primary', theme.fonts.primary);
    }
    
    if (theme.fontFamily) {
      root.style.setProperty('--font-primary', theme.fontFamily);
    }
  }, [theme]);

  return <>{children}</>;
}
