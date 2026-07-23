export type AppSettings = {
  provider: string;
  apiKey: string;
  transcribeModel: string;
  summaryModel: string;
};

const STORAGE_KEY = 'app_settings';

const DEFAULTS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  // Empty means "let the server pick its default model".
  transcribeModel: '',
  summaryModel: '',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
