// 主题配置常量

import type { ThemeType } from '@/types';

export const THEMES: ThemeType[] = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan', 'dark'];

export const THEME_COLORS: Record<ThemeType, { primary: string; bg: string; text: string }> = {
  blue: {
    primary: '#4263eb',
    bg: '#eef2ff',
    text: '#364fc7',
  },
  green: {
    primary: '#40c057',
    bg: '#ebfbee',
    text: '#2f9e44',
  },
  purple: {
    primary: '#be4bdb',
    bg: '#f8f0fc',
    text: '#9c36b5',
  },
  orange: {
    primary: '#fd7e14',
    bg: '#fff4e6',
    text: '#e67700',
  },
  pink: {
    primary: '#f06595',
    bg: '#fff0f6',
    text: '#d63384',
  },
  cyan: {
    primary: '#15aabf',
    bg: '#e3fafc',
    text: '#0c8599',
  },
  dark: {
    primary: '#343a40',
    bg: '#212529',
    text: '#f8f9fa',
  },
};

export const TIME_THEME_HOURS = {
  DAY_START: 6,
  DAY_END: 18,
} as const;
