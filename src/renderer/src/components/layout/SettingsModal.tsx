import { useState, useEffect, useRef } from 'react';
import { X, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { Modal } from '@renderer/components/ui/modal';
import { loadSettings, saveSettings, type AppSettings } from '@renderer/lib/settings';

type GeminiModel = { id: string; displayName: string; description?: string };

const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'claude', name: 'Anthropic Claude' },
  { id: 'openai', name: 'OpenAI' },
];

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    if (isOpen) setSettings(loadSettings());
  }, [isOpen]);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const list = await window.api.gemini.listModels(loadSettings().apiKey || undefined);
      setModels(list || []);
    } catch (err: any) {
      setModelsError(err.message);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // The model list comes from the API key configured on the server, so it is
  // fetched fresh each time the dialog opens rather than hardcoded.
  useEffect(() => {
    if (isOpen && !models.length && !modelsError) fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = () => {
    saveSettings(settings);
    onClose();
  };

  const modelOptions = [
    { id: '', displayName: 'Server default' },
    ...models.map((m) => ({ id: m.id, displayName: m.displayName })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-md">
      <div className="bg-bg border-ink max-h-[85vh] w-full overflow-y-auto border-[3px] p-8 shadow-[8px_8px_0_var(--ink)]">
        <button
          onClick={onClose}
          className="text-ink hover:text-accent absolute top-4 right-4 transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="font-display text-ink mb-6 text-[2.5rem] leading-none">User Settings</h2>

        <div className="mb-8 space-y-6">
          <Dropdown
            label="AI Provider"
            value={settings.provider}
            options={PROVIDERS.map((p) => ({ id: p.id, displayName: p.name }))}
            onChange={(provider) => setSettings({ ...settings, provider })}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-ink font-mono text-[0.7rem] font-bold tracking-[0.1em] uppercase">
                Models
              </label>
              <button
                onClick={fetchModels}
                disabled={isLoadingModels}
                className="hover:text-accent flex items-center gap-1 font-mono text-[0.65rem] uppercase opacity-60 transition-all hover:opacity-100 disabled:opacity-40"
              >
                <RefreshCw size={11} className={isLoadingModels ? 'animate-spin' : ''} />
                {isLoadingModels ? 'Loading' : 'Refresh'}
              </button>
            </div>
            {modelsError ? (
              <p className="mb-3 font-mono text-[0.75rem] text-[#E53935]">
                Could not list models: {modelsError}
              </p>
            ) : (
              <p className="text-ink-muted mb-3 text-[0.75rem]">
                Listed live from the Gemini API key configured on the server.
              </p>
            )}

            <div className="space-y-4">
              <Dropdown
                label="Transcription model"
                value={settings.transcribeModel}
                options={modelOptions}
                onChange={(transcribeModel) => setSettings({ ...settings, transcribeModel })}
              />
              <Dropdown
                label="Summary model"
                value={settings.summaryModel}
                options={modelOptions}
                onChange={(summaryModel) => setSettings({ ...settings, summaryModel })}
              />
            </div>
          </div>

          <div>
            <label className="text-ink mb-2 block font-mono text-[0.7rem] font-bold tracking-[0.1em] uppercase">
              API Key
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              className="bg-card border-ink focus:border-accent placeholder:text-ink/30 w-full border-2 p-3 font-mono text-[0.9rem] outline-none"
              placeholder="Enter your API key..."
            />
            <p className="text-ink-muted mt-2 text-[0.7rem]">
              Requests are made by the server using <code>GEMINI_API_KEY</code>; a key entered here
              is stored locally and not sent anywhere yet.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-accent font-display border-ink w-full border-[3px] p-4 text-[1.5rem] text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
        >
          Save Configuration
        </button>
      </div>
    </Modal>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; displayName: string }[];
  onChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selected = options.find((o) => o.id === value);

  return (
    <div ref={ref} className="relative">
      <label className="text-ink mb-2 block font-mono text-[0.7rem] font-bold tracking-[0.1em] uppercase">
        {label}
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-card border-ink focus:border-accent flex w-full items-center justify-between gap-2 border-2 p-3 text-left font-mono text-[0.85rem] outline-none"
      >
        <span className="truncate">{selected?.displayName || value || 'Server default'}</span>
        <ChevronDown size={14} className="shrink-0 opacity-60" />
      </button>

      {isOpen && (
        <div className="bg-card border-ink animate-in fade-in absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto border-2 shadow-[4px_4px_0_var(--ink)] duration-100">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className="hover:bg-ink/10 text-ink flex w-full items-center gap-2 px-3 py-2.5 text-left font-mono text-[0.8rem] transition-colors"
            >
              <span className="w-4 shrink-0">{value === option.id && <Check size={14} />}</span>
              <span className="truncate">{option.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
