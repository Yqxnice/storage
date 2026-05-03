import { useState, useEffect, useCallback } from 'react';
import { applyTheme as applyThemeUtil, applyTimeTheme } from '@/utils/theme';
import { THEME_DEFAULT, TIME_THEME_HOURS } from '@/constants';
import type { ThemeType } from '@/types';

interface UseThemeOptions {
  timeThemeEnabled?: boolean;
}

export function useTheme(options: UseThemeOptions = {}) {
  const { timeThemeEnabled = false } = options;
  const [theme, setThemeState] = useState<ThemeType>(THEME_DEFAULT);

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    applyThemeUtil(newTheme);
  }, []);

  const checkAndApplyTimeTheme = useCallback(() => {
    if (timeThemeEnabled) {
      const newTheme = applyTimeTheme(true, theme);
      if (newTheme !== theme) {
        setThemeState(newTheme);
        applyThemeUtil(newTheme);
      }
    }
  }, [timeThemeEnabled, theme, setTheme]);

  useEffect(() => {
    let intervalId: number | null = null;
    if (timeThemeEnabled) {
      checkAndApplyTimeTheme();
      intervalId = window.setInterval(checkAndApplyTimeTheme, 60 * 60 * 1000);
    }
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [timeThemeEnabled, checkAndApplyTimeTheme]);

  return { theme, setTheme };
}

export function useTimeThemeCheck(currentTheme: ThemeType, enabled: boolean) {
  const [isDay, setIsDay] = useState(() => {
    const hour = new Date().getHours();
    return hour >= TIME_THEME_HOURS.DAY_START && hour < TIME_THEME_HOURS.DAY_END;
  });

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      setIsDay(hour >= TIME_THEME_HOURS.DAY_START && hour < TIME_THEME_HOURS.DAY_END);
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled]);

  return isDay;
}
