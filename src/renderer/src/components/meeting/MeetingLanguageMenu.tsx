import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';

export type Language = {
  id: string;
  name: string;
};

const SUPPORTED_LANGUAGES: Language[] = [
  { id: 'en-US', name: 'English (US)' },
  { id: 'pt-BR', name: 'Português (Brasil)' },
  { id: 'es-ES', name: 'Español (España)' },
  { id: 'fr-FR', name: 'Français (France)' },
  { id: 'de-DE', name: 'Deutsch' },
];

export function MeetingLanguageMenu({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.id === selectedId) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="border-ink text-ink flex items-center gap-2 border-2 bg-white px-3 py-2 font-mono text-[0.8rem] font-bold transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[2px] active:shadow-none"
      >
        <Globe size={14} className="opacity-60" />
        <span className="font-normal opacity-60">Language:</span>
        {selectedLanguage.name}
        <ChevronDown size={14} className="ml-1 opacity-60" />
      </button>

      {isOpen && (
        <div className="bg-bg border-ink animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 flex w-[240px] flex-col border-[3px] py-2 shadow-[4px_4px_0_var(--ink)] duration-200">
          <div className="text-ink px-4 py-2 font-mono text-[0.7rem] tracking-[0.1em] uppercase opacity-60">
            Transcription Language
          </div>

          <div className="flex flex-col">
            {SUPPORTED_LANGUAGES.map((language) => (
              <div
                key={language.id}
                className="group hover:bg-ink/10 text-ink relative flex cursor-pointer items-center justify-between px-4 py-2 text-[0.9rem] font-bold"
                onClick={() => {
                  onSelect(language.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <Globe size={16} className="opacity-70" />
                  <span>{language.name}</span>
                </div>

                {selectedId === language.id && (
                  <span className="text-accent absolute right-4">
                    <Check size={16} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
