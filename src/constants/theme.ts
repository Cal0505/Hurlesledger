export type ThemeMode = 'light' | 'dark' | 'system';

export type AccentColor =
  | 'ocean'
  | 'forest'
  | 'lavender'
  | 'sunset'
  | 'crimson'
  | 'glacier'
  | 'midnight'
  | 'tidepool';

export const DEFAULT_ACCENT: AccentColor = 'ocean';

export const ACCENT_COLORS: Array<{
  id: AccentColor;
  label: string;
  hex: string;
}> = [
  { id: 'ocean', label: 'Ocean', hex: '#3b82f6' },
  { id: 'forest', label: 'Forest', hex: '#10b981' },
  { id: 'lavender', label: 'Lavender', hex: '#a855f7' },
  { id: 'sunset', label: 'Sunset', hex: '#f97316' },
  { id: 'crimson', label: 'Crimson', hex: '#ef4444' },
  { id: 'glacier', label: 'Glacier', hex: '#06b6d4' },
  { id: 'midnight', label: 'Midnight', hex: '#6366f1' },
  { id: 'tidepool', label: 'Tidepool', hex: '#14b8a6' },
];

export const THEME_STORAGE_KEY = 'hurlesledger-theme';
export const ACCENT_STORAGE_KEY = 'hurlesledger-accent';

export type ThemeState = {
  mode: ThemeMode;
  accent: AccentColor;
};