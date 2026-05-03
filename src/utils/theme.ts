// 主题色管理系统

export interface ThemeColors {
  // 基础颜色
  bg: string;
  surface: string;
  card: string;
  cardHover: string;
  border: string;
  borderLit: string;
  txt: string;
  txt2: string;
  txt3: string;
  
  // 状态颜色
  green: string;
  greenBg: string;
  amber: string;
  amberBg: string;
  red: string;
  redBg: string;
  
  // 主题色
  accent: string;
  accentBg: string;
  accentTxt: string;
  accentHover: string;
  accentBorder: string;
}

export type ThemeKey = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan' | 'dark';

export const THEMES: Record<ThemeKey, ThemeColors> = {
  // 静谧蓝 - 优化为更柔和的莫兰迪蓝
  blue: {
    // 基础颜色
    bg: '#f5f7fb',
    surface: '#fafbfc',
    card: '#ffffff',
    cardHover: '#fafbfe',
    border: '#e4e9f2',
    borderLit: '#d7e0f1',
    txt: '#1d2129',
    txt2: '#4e5969',
    txt3: '#86909c',
    
    // 状态颜色
    green: '#00b42a',
    greenBg: '#e8fff3',
    amber: '#ff7d00',
    amberBg: '#fff7e8',
    red: '#f53f3f',
    redBg: '#fff1f0',
    
    // 主题色 - 莫兰迪静谧蓝
    accent: '#4080ff',
    accentBg: '#e6f0ff',
    accentTxt: '#3370e0',
    accentHover: '#3370e0',
    accentBorder: '#4080ff',
  },
  
  // 森系绿 - 优化为清新牛油果绿
  green: {
    // 基础颜色
    bg: '#f2f9f2',
    surface: '#f8fcf8',
    card: '#ffffff',
    cardHover: '#f8fcf8',
    border: '#deeedd',
    borderLit: '#cfe8cf',
    txt: '#1d2129',
    txt2: '#4e5969',
    txt3: '#86909c',
    
    // 状态颜色
    green: '#52c41a',
    greenBg: '#f0f8e8',
    amber: '#95de64',
    amberBg: '#f6ffed',
    red: '#ff7875',
    redBg: '#fff1f0',
    
    // 主题色 - 牛油果绿
    accent: '#52c41a',
    accentBg: '#f0f8e8',
    accentTxt: '#45a817',
    accentHover: '#45a817',
    accentBorder: '#52c41a',
  },
  
  // 优雅紫 - 优化为低饱和香芋紫
  purple: {
    // 基础颜色
    bg: '#f7f5fb',
    surface: '#fbf9fe',
    card: '#ffffff',
    cardHover: '#fbf9fe',
    border: '#e9e3f2',
    borderLit: '#d9cfe6',
    txt: '#1d2129',
    txt2: '#4e5969',
    txt3: '#86909c',
    
    // 状态颜色
    green: '#9254de',
    greenBg: '#f9f0ff',
    amber: '#d3adf7',
    amberBg: '#faf5ff',
    red: '#ff85c0',
    redBg: '#fff0f6',
    
    // 主题色 - 香芋紫
    accent: '#722ed1',
    accentBg: '#f4e8ff',
    accentTxt: '#6227b0',
    accentHover: '#6227b0',
    accentBorder: '#722ed1',
  },
  
  // 暖橙 - 优化为元气柑橘橙
  orange: {
    // 基础颜色
    bg: '#fff9f2',
    surface: '#fffcf8',
    card: '#ffffff',
    cardHover: '#fffcf8',
    border: '#f9e8d5',
    borderLit: '#f2d4b8',
    txt: '#1d2129',
    txt2: '#4e5969',
    txt3: '#86909c',
    
    // 状态颜色
    green: '#ffa940',
    greenBg: '#fff7e6',
    amber: '#ffd591',
    amberBg: '#fffbe6',
    red: '#ff7875',
    redBg: '#fff1f0',
    
    // 主题色 - 柑橘橙
    accent: '#fa8c16',
    accentBg: '#fff7e8',
    accentTxt: '#e07c14',
    accentHover: '#e07c14',
    accentBorder: '#fa8c16',
  },
  
  // 柔粉 - 优化为豆沙粉
  pink: {
    // 基础颜色
    bg: '#fef7fb',
    surface: '#fffbfe',
    card: '#ffffff',
    cardHover: '#fffbfe',
    border: '#f7d9e8',
    borderLit: '#f0b9d3',
    txt: '#1d2129',
    txt2: '#4e5969',
    txt3: '#86909c',
    
    // 状态颜色
    green: '#ff85c0',
    greenBg: '#fff0f6',
    amber: '#ffb3d9',
    amberBg: '#fff5fa',
    red: '#ff7875',
    redBg: '#fff1f0',
    
    // 主题色 - 豆沙粉
    accent: '#eb2f96',
    accentBg: '#ffeff7',
    accentTxt: '#d42987',
    accentHover: '#d42987',
    accentBorder: '#eb2f96',
  },
  
  // 清青 - 优化为薄荷青
  cyan: {
    // 基础颜色
    bg: '#f0f9fb',
    surface: '#f8fdfe',
    card: '#ffffff',
    cardHover: '#f8fdfe',
    border: '#d1eef2',
    borderLit: '#b3e0e6',
    txt: '#1d2129',
    txt2: '#4e5969',
    txt3: '#86909c',
    
    // 状态颜色
    green: '#69c0ff',
    greenBg: '#e6f7ff',
    amber: '#91d5ff',
    amberBg: '#f0f9ff',
    red: '#ff7875',
    redBg: '#fff1f0',
    
    // 主题色 - 薄荷青
    accent: '#13c2c2',
    accentBg: '#e6fffb',
    accentTxt: '#10adad',
    accentHover: '#10adad',
    accentBorder: '#13c2c2',
  },
  
  // 深空黑 - 优化为高级灰黑
  dark: {
    // 基础颜色
    bg: '#141414',
    surface: '#1f1f1f',
    card: '#262626',
    cardHover: '#2c2c2c',
    border: '#303030',
    borderLit: '#3a3a3a',
    txt: '#f5f5f5',
    txt2: '#d9d9d9',
    txt3: '#8c8c8c',
    
    // 状态颜色
    green: '#36d399',
    greenBg: '#1a362d',
    amber: '#fb923c',
    amberBg: '#362b1a',
    red: '#f87171',
    redBg: '#361a1a',
    
    // 主题色 - 深空蓝灰
    accent: '#60a5fa',
    accentBg: '#1a2533',
    accentTxt: '#7cb0fc',
    accentHover: '#5294f8',
    accentBorder: '#60a5fa',
  },
  

};

// 默认主题
export const DEFAULT_THEME: ThemeKey = 'blue';

// 获取主题颜色
export function getThemeColors(theme: ThemeKey): ThemeColors {
  return THEMES[theme] || THEMES[DEFAULT_THEME];
}

// 应用主题到文档
export function applyTheme(theme: ThemeKey): void {
  const colors = getThemeColors(theme);
  
  // 设置 data-theme 属性
  document.documentElement.setAttribute('data-theme', theme);
  
  // 应用 CSS 变量
  const root = document.documentElement;
  
  // 基础颜色
  root.style.setProperty('--bg', colors.bg);
  root.style.setProperty('--surface', colors.surface);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--card-hover', colors.cardHover);
  root.style.setProperty('--border', colors.border);
  root.style.setProperty('--border-lit', colors.borderLit);
  root.style.setProperty('--txt', colors.txt);
  root.style.setProperty('--txt2', colors.txt2);
  root.style.setProperty('--txt3', colors.txt3);
  
  // 状态颜色
  root.style.setProperty('--green', colors.green);
  root.style.setProperty('--green-bg', colors.greenBg);
  root.style.setProperty('--amber', colors.amber);
  root.style.setProperty('--amber-bg', colors.amberBg);
  root.style.setProperty('--red', colors.red);
  root.style.setProperty('--red-bg', colors.redBg);
  
  // 主题色
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-bg', colors.accentBg);
  root.style.setProperty('--accent-txt', colors.accentTxt);
  root.style.setProperty('--accent-hover', colors.accentHover);
  root.style.setProperty('--accent-border', colors.accentBorder);
}

// 根据当前时间获取主题
export function getTimeBasedTheme(): ThemeKey {
  const now = new Date();
  const hour = now.getHours();
  // 6:00 - 18:00 为白天，使用亮色主题（默认蓝色）
  // 18:00 - 6:00 为晚上，使用深色主题
  return hour >= 6 && hour < 18 ? 'blue' : 'dark';
}

// 应用时间主题
export function applyTimeTheme(enabled: boolean, currentTheme: ThemeKey): ThemeKey {
  if (enabled) {
    const timeTheme = getTimeBasedTheme();
    applyTheme(timeTheme);
    return timeTheme;
  } else {
    applyTheme(currentTheme);
    return currentTheme;
  }
}

// 获取主题色选项
export function getThemeOptions() {
  return [
    { key: 'blue', name: '静谧蓝', color: '#4080ff' },
    { key: 'green', name: '牛油果绿', color: '#52c41a' },
    { key: 'purple', name: '香芋紫', color: '#722ed1' },
    { key: 'orange', name: '柑橘橙', color: '#fa8c16' },
    { key: 'pink', name: '豆沙粉', color: '#eb2f96' },
    { key: 'cyan', name: '薄荷青', color: '#13c2c2' },
    { key: 'dark', name: '深空黑', color: '#141414' },
  ];
}