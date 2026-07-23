export type AppSettings = {
  provider: string;
  apiKey: string;
  transcribeModel: string;
  summaryModel: string;
};

const DEFAULTS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  // Empty means "let the server pick its default model".
  transcribeModel: '',
  summaryModel: '',
};

/**
 * Settings live in the `settings` table in the main process. They are read once
 * during bootstrap into this cache so the rest of the app can keep reading them
 * synchronously; writes go straight through to the database.
 */
let cache: Record<string, string> = {};

export async function hydrateSettings(): Promise<void> {
  cache = await window.api.settings.getAll();
}

export function loadSettings(): AppSettings {
  return {
    provider: cache.provider || DEFAULTS.provider,
    apiKey: cache.apiKey ?? DEFAULTS.apiKey,
    transcribeModel: cache.transcribeModel ?? DEFAULTS.transcribeModel,
    summaryModel: cache.summaryModel ?? DEFAULTS.summaryModel,
  };
}

export function saveSettings(settings: AppSettings): void {
  const entries: Record<string, string> = {
    provider: settings.provider,
    apiKey: settings.apiKey,
    transcribeModel: settings.transcribeModel,
    summaryModel: settings.summaryModel,
  };
  cache = { ...cache, ...entries };
  window.api.settings.setMany(entries).catch((e) => console.error('Failed to save settings', e));
}

export function getSetting(key: string): string | undefined {
  return cache[key] || undefined;
}

export function setSetting(key: string, value: string): void {
  cache = { ...cache, [key]: value };
  window.api.settings
    .setMany({ [key]: value })
    .catch((e) => console.error(`Failed to save setting "${key}"`, e));
}
