import { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  PenTool,
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
import type { InstructionTemplate } from '@renderer/lib/instructions';

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
  const [prompt, setPrompt] = useState('');
  const [selectedIconId, setSelectedIconId] = useState('custom');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setPrompt(initialData?.prompt || '');
    setSelectedIconId(initialData?.icon || 'custom');
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

  const handleSave = () => {
    onSave({
      name: name.trim() || 'Untitled',
      prompt: prompt.trim(),
      icon: selectedIconId,
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
              <PenTool size={24} className="text-[#FFFEF2]" />
              <h2 className="text-[1.5rem] font-bold text-[#FFFEF2]">Instructions</h2>
            </div>
            <p className="mb-8 text-[0.95rem] font-medium text-[#FFFEF2]/60 italic">
              Give AI instructions on how to format the summary, where to focus, how to structure
              action items, and more. Use Markdown for formatting.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                handleTextareaResize(e.target);
              }}
              className="min-h-[200px] w-full resize-none overflow-hidden border-none bg-transparent p-0 text-[#FFFEF2]/80 outline-none placeholder:text-white/30"
              placeholder="e.g. Write a summary for a weekly sync. Include action items as checkboxes..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
