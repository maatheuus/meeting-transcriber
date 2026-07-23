import { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  PenTool,
  Plus,
  Trash2,
  Sparkles,
  Briefcase,
  Phone,
  Users,
  FileText,
  Cpu,
  Zap,
  Target,
  Coffee,
} from 'lucide-react';
import { Modal } from '@renderer/components/ui/modal';
import type { InstructionSection, InstructionTemplate } from '@renderer/lib/instructions';

const AVAILABLE_ICONS = [
  { id: 'custom', icon: BookOpen },
  { id: 'sparkles', icon: Sparkles },
  { id: 'briefcase', icon: Briefcase },
  { id: 'phone', icon: Phone },
  { id: 'users', icon: Users },
  { id: 'file', icon: FileText },
  { id: 'cpu', icon: Cpu },
  { id: 'zap', icon: Zap },
  { id: 'target', icon: Target },
  { id: 'coffee', icon: Coffee },
];

const emptySection = (): InstructionSection => ({ id: Date.now(), title: '', instructions: '' });

export function CustomInstructionModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<InstructionTemplate, 'id'>) => void;
  initialData?: InstructionTemplate | null;
}) {
  const [name, setName] = useState('');
  const [context, setContext] = useState('');
  const [selectedIconId, setSelectedIconId] = useState('custom');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [sections, setSections] = useState<InstructionSection[]>([emptySection()]);

  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setContext(initialData?.context || '');
    setSelectedIconId(initialData?.icon || 'custom');
    setSections(initialData?.format?.length ? initialData.format : [emptySection()]);
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isIconPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setIsIconPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIconPickerOpen]);

  const handleTextareaResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const patchSection = (index: number, patch: Partial<InstructionSection>) =>
    setSections(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const handleSave = () => {
    onSave({
      name: name.trim() || 'Untitled',
      context: context.trim(),
      icon: selectedIconId,
      format: sections.filter((s) => s.title.trim() || s.instructions.trim()),
    });
    onClose();
  };

  const SelectedIcon = AVAILABLE_ICONS.find((i) => i.id === selectedIconId)?.icon || BookOpen;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-3xl">
      <div className="border-ink flex max-h-[90vh] w-full flex-col overflow-hidden border-[3px] bg-[#1e1d1a] shadow-[8px_8px_0_var(--ink)]">
        <div className="border-ink flex items-center justify-between gap-4 border-b-[3px] bg-[#2D3748] px-6 py-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <BookOpen size={20} className="shrink-0 opacity-80" />
            <div className="min-w-0">
              <p className="text-[0.95rem] font-bold">
                This page contains AI Meeting Notes summary instructions.
              </p>
              <p className="text-[0.8rem] font-medium opacity-80">
                Add this page to your instructions menu to use it for your meetings.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={handleSave}
              className="border-2 border-white/20 bg-white/10 px-4 py-2 text-[0.85rem] font-bold transition-colors hover:bg-white/20"
            >
              {initialData ? 'Save instructions' : 'Add to my instructions'}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-white/50 transition-colors hover:text-white"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-12">
          <div className="relative mb-12 flex items-center gap-4">
            <div className="relative" ref={iconPickerRef}>
              <button
                onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
                className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#FFFEF2] transition-colors hover:bg-white/10"
              >
                <SelectedIcon size={32} />
              </button>

              {isIconPickerOpen && (
                <div className="border-ink absolute top-full left-0 z-50 mt-2 grid grid-cols-5 gap-2 rounded-lg border-2 bg-[#2D3748] p-2 shadow-xl">
                  {AVAILABLE_ICONS.map(({ id, icon: IconComp }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedIconId(id);
                        setIsIconPickerOpen(false);
                      }}
                      className={`flex items-center justify-center rounded-md p-2 transition-colors ${
                        selectedIconId === id
                          ? 'bg-accent text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconComp size={20} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-display flex-1 border-none bg-transparent text-[3rem] font-bold text-[#FFFEF2] outline-none placeholder:text-white/20"
              placeholder="New Summary Instructions"
            />
          </div>

          <div className="mb-12">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={24} className="text-[#FFFEF2]" />
              <h2 className="text-[1.5rem] font-bold text-[#FFFEF2]">Context</h2>
            </div>
            <p className="mb-4 text-[0.95rem] font-medium text-[#FFFEF2]/60 italic">
              Give AI context on the meeting and when to use this page.
            </p>
            <textarea
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                handleTextareaResize(e.target);
              }}
              className="min-h-[40px] w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[#FFFEF2] outline-none placeholder:text-white/30"
              placeholder="e.g. Use this for weekly syncs..."
            />
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <PenTool size={24} className="text-[#FFFEF2]" />
              <h2 className="text-[1.5rem] font-bold text-[#FFFEF2]">Summary format</h2>
            </div>
            <p className="mb-8 text-[0.95rem] font-medium text-[#FFFEF2]/60 italic">
              Give AI instructions on how to format the summary, where to focus, how to structure
              action items, and more. Use Markdown for formatting.
            </p>

            <div className="space-y-8 pl-4">
              {sections.map((section, index) => (
                <div key={section.id} className="group relative">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => patchSection(index, { title: e.target.value })}
                      className="mb-2 flex-1 border-none bg-transparent text-[1.1rem] font-bold text-[#FFFEF2] outline-none placeholder:text-white/30"
                      placeholder="Section title"
                    />
                    {sections.length > 1 && (
                      <button
                        onClick={() => setSections(sections.filter((_, i) => i !== index))}
                        className="text-white/40 opacity-0 transition-all group-hover:opacity-100 hover:text-[#FF7043]"
                        title="Remove section"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={section.instructions}
                    onChange={(e) => {
                      patchSection(index, { instructions: e.target.value });
                      handleTextareaResize(e.target);
                    }}
                    className="min-h-[24px] w-full resize-none overflow-hidden border-none bg-transparent text-[#FFFEF2]/80 italic outline-none placeholder:text-white/20"
                    placeholder="[Add instructions]"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => setSections([...sections, { ...emptySection(), id: Date.now() }])}
              className="mt-6 flex items-center gap-2 text-[0.9rem] font-bold text-[#FFFEF2]/60 transition-colors hover:text-[#FF7043]"
            >
              <Plus size={16} /> Add another section
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
