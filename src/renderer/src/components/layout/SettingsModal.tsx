import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  ChevronDown,
  RefreshCw,
  Mic,
  Monitor,
  Trash2,
  Sliders,
  Shield,
  ScrollText,
} from 'lucide-react';
import { Modal } from '@renderer/components/ui/modal';
import { loadSettings, saveSettings, type AppSettings } from '@renderer/lib/settings';

type GeminiModel = { id: string; displayName: string; description?: string };

type MediaPermissionStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';

type PermissionStatus = {
  platform: string;
  microphone: MediaPermissionStatus;
  screen: MediaPermissionStatus;
};

type LogEntry = {
  id: number;
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  source: string;
  message: string;
  detail?: string;
};

type Tab = 'general' | 'permissions' | 'logs';

const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'claude', name: 'Anthropic Claude' },
  { id: 'openai', name: 'OpenAI' },
];

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const refreshPermissions = useCallback(async () => {
    try {
      const status = await window.api.permissions.getStatus();
      setPermissions(status);
    } catch {
      setPermissions(null);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const list = await window.api.logs.list();
      setLogs(list || []);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      refreshPermissions();
      refreshLogs();
    }
  }, [isOpen, refreshPermissions, refreshLogs]);

  useEffect(() => {
    if (!isOpen) return;
    const onFocus = () => {
      refreshPermissions();
      refreshLogs();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isOpen, refreshPermissions, refreshLogs]);

  const handleRequestMic = async () => {
    setIsRequestingMic(true);
    try {
      await window.api.permissions.requestMicrophone();
    } finally {
      setIsRequestingMic(false);
      refreshPermissions();
    }
  };

  const handleOpenScreenSettings = async () => {
    await window.api.permissions.openScreenSettings();
  };

  const handleClearLogs = async () => {
    await window.api.logs.clear();
    setLogs([]);
  };

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
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-2xl">
      <div className="bg-bg border-ink relative flex max-h-[85vh] w-full flex-col border-[3px] shadow-[8px_8px_0_var(--ink)]">
        <button
          onClick={onClose}
          className="text-ink hover:text-accent absolute top-4 right-4 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="px-8 pt-8 pb-4">
          <h2 className="font-display text-ink mb-4 text-[2.5rem] leading-none">User Settings</h2>
          <div className="border-ink flex border-b-2">
            <TabButton active={tab === 'general'} onClick={() => setTab('general')} icon={<Sliders size={14} />}>
              General
            </TabButton>
            <TabButton active={tab === 'permissions'} onClick={() => setTab('permissions')} icon={<Shield size={14} />}>
              Permissions
            </TabButton>
            <TabButton active={tab === 'logs'} onClick={() => setTab('logs')} icon={<ScrollText size={14} />}>
              Logs {logs.length > 0 && <span className="opacity-60">({logs.length})</span>}
            </TabButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-6">
          {tab === 'general' && (
            <div className="space-y-6">
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
                  Requests are made by the server using <code>GEMINI_API_KEY</code>; a key entered
                  here is stored locally and not sent anywhere yet.
                </p>
              </div>
            </div>
          )}

          {tab === 'permissions' && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-ink font-mono text-[0.7rem] font-bold tracking-[0.1em] uppercase">
                  System Permissions
                </label>
                <button
                  onClick={refreshPermissions}
                  className="hover:text-accent flex items-center gap-1 font-mono text-[0.65rem] uppercase opacity-60 transition-all hover:opacity-100"
                >
                  <RefreshCw size={11} />
                  Refresh
                </button>
              </div>
              <p className="text-ink-muted mb-3 text-[0.75rem]">
                Access the app needs to record meetings.
              </p>
              <div className="space-y-2">
                <PermissionRow
                  icon={<Mic size={14} />}
                  label="Microphone"
                  status={permissions?.microphone}
                  platform={permissions?.platform}
                  onRequest={handleRequestMic}
                  isBusy={isRequestingMic}
                  requestLabel="Grant Access"
                />
                <PermissionRow
                  icon={<Monitor size={14} />}
                  label="Screen Recording"
                  status={permissions?.screen}
                  platform={permissions?.platform}
                  onRequest={handleOpenScreenSettings}
                  requestLabel="Open System Settings"
                />
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-ink font-mono text-[0.7rem] font-bold tracking-[0.1em] uppercase">
                  Error Logs
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={refreshLogs}
                    disabled={isLoadingLogs}
                    className="hover:text-accent flex items-center gap-1 font-mono text-[0.65rem] uppercase opacity-60 transition-all hover:opacity-100 disabled:opacity-40"
                  >
                    <RefreshCw size={11} className={isLoadingLogs ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                  <button
                    onClick={handleClearLogs}
                    disabled={!logs.length}
                    className="hover:text-accent flex items-center gap-1 font-mono text-[0.65rem] uppercase opacity-60 transition-all hover:opacity-100 disabled:opacity-30"
                  >
                    <Trash2 size={11} />
                    Clear
                  </button>
                </div>
              </div>
              {logs.length === 0 ? (
                <p className="text-ink-muted py-8 text-center font-mono text-[0.75rem]">
                  No entries logged.
                </p>
              ) : (
                <div className="space-y-2">
                  {logs.map((entry) => (
                    <LogRow key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {tab === 'general' && (
          <div className="border-ink border-t-2 p-6">
            <button
              onClick={handleSave}
              className="bg-accent font-display border-ink w-full border-[3px] p-4 text-[1.5rem] text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-[2px] flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-[0.75rem] font-bold tracking-[0.05em] uppercase transition-colors ${
        active ? 'border-accent text-ink' : 'text-ink-muted hover:text-ink border-transparent'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false);
  const time = new Date(entry.timestamp).toLocaleString();
  const levelColor =
    entry.level === 'error'
      ? 'text-[#E53935]'
      : entry.level === 'warn'
        ? 'text-[#EF6C00]'
        : 'text-ink-muted';

  return (
    <div className="border-ink bg-card border-2 p-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full flex-col items-start gap-1 text-left"
      >
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-mono text-[0.65rem] font-bold uppercase ${levelColor}`}>
              {entry.level}
            </span>
            <span className="text-ink-muted font-mono text-[0.65rem] truncate">{entry.source}</span>
          </div>
          <span className="text-ink-muted font-mono text-[0.65rem] shrink-0">{time}</span>
        </div>
        <div className="text-ink font-mono text-[0.75rem] break-words">{entry.message}</div>
      </button>
      {open && entry.detail && (
        <pre className="border-ink bg-bg mt-2 max-h-64 overflow-auto border-2 p-2 font-mono text-[0.65rem] whitespace-pre-wrap">
          {entry.detail}
        </pre>
      )}
    </div>
  );
}

function PermissionRow({
  icon,
  label,
  status,
  platform,
  onRequest,
  isBusy,
  requestLabel,
}: {
  icon: React.ReactNode;
  label: string;
  status: MediaPermissionStatus | undefined;
  platform: string | undefined;
  onRequest: () => void | Promise<void>;
  isBusy?: boolean;
  requestLabel: string;
}) {
  const granted = status === 'granted';
  const canRequest = platform === 'darwin' && !granted && status !== undefined;

  const statusText = (() => {
    if (!status) return 'Checking…';
    if (platform !== 'darwin') return 'Not applicable';
    switch (status) {
      case 'granted':
        return 'Granted';
      case 'denied':
        return 'Denied';
      case 'restricted':
        return 'Restricted';
      case 'not-determined':
        return 'Not requested';
      default:
        return 'Unknown';
    }
  })();

  const statusColor = granted
    ? 'text-[#2E7D32]'
    : status === 'denied'
      ? 'text-[#E53935]'
      : 'text-ink-muted';

  return (
    <div className="border-ink bg-card flex items-center justify-between border-2 p-3">
      <div className="flex items-center gap-3">
        <span className="text-ink opacity-70">{icon}</span>
        <div>
          <div className="text-ink font-mono text-[0.8rem] font-bold uppercase">{label}</div>
          <div className={`font-mono text-[0.7rem] ${statusColor}`}>{statusText}</div>
        </div>
      </div>
      {canRequest && (
        <button
          onClick={onRequest}
          disabled={isBusy}
          className="border-ink hover:bg-accent hover:text-white border-2 px-3 py-1.5 font-mono text-[0.7rem] font-bold uppercase transition-colors disabled:opacity-50"
        >
          {isBusy ? 'Requesting…' : requestLabel}
        </button>
      )}
    </div>
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
