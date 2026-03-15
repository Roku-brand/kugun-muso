export const SETTINGS_DEFAULTS = {
  aircraftColor: '#6cf4ff',
  missileColor: '#ffae42',
  controlSensitivity: 'medium',
  bgmVolume: 0.4,
  seVolume: 0.7,
  masterVolume: 0.8,
  quality: 'high',
  difficulty: 'normal',
  pilotUiOffsetX: 0,
  pilotUiOffsetY: 0,
  weaponUiOffsetX: 0,
  weaponUiOffsetY: 0,
};

const KEY = 'kugun_settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...SETTINGS_DEFAULTS };
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function resetSettings() {
  saveSettings(SETTINGS_DEFAULTS);
  return { ...SETTINGS_DEFAULTS };
}
