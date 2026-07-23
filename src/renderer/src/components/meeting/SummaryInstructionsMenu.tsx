import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Sparkles,
  Briefcase,
  Phone,
  Users,
  FileText,
  BookOpen,
  Cpu,
  Zap,
  Target,
  Coffee,
  Plus,
  Pin,
  MinusCircle,
  Pencil,
  Check,
} from 'lucide-react';
import { CustomInstructionModal } from './CustomInstructionModal';
import type { InstructionTemplate } from '@renderer/lib/instructions';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sparkles: Sparkles,
  briefcase: Briefcase,
  phone: Phone,
  users: Users,
  file: FileText,
  custom: BookOpen,
  cpu: Cpu,
  zap: Zap,
  target: Target,
  coffee: Coffee,
};

function TemplateIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] || FileText;
  return <Icon size={16} className={className} />;
}

export function SummaryInstructionsMenu({
  templates,
  onChangeTemplates,
  selectedId,
  onSelect,
}: {
  templates: InstructionTemplate[];
  onChangeTemplates: (templates: InstructionTemplate[]) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<InstructionTemplate | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedTemplate = templates.find((t) => t.id === selectedId) || templates[0];

  const handleSetDefault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChangeTemplates(templates.map((t) => ({ ...t, isDefault: t.id === id })));
  };

  const handleEdit = (e: React.MouseEvent, template: InstructionTemplate) => {
    e.stopPropagation();
    setTemplateToEdit(template);
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const remaining = templates.filter((t) => t.id !== id);
    onChangeTemplates(remaining);
    if (selectedId === id && remaining.length) {
      onSelect((remaining.find((t) => t.isDefault) || remaining[0]).id);
    }
  };

  const handleSaveCustom = (data: Omit<InstructionTemplate, 'id'>) => {
    if (templateToEdit) {
      onChangeTemplates(templates.map((t) => (t.id === templateToEdit.id ? { ...t, ...data } : t)));
      return;
    }
    const newTemplate: InstructionTemplate = { id: `custom_${Date.now()}`, ...data };
    onChangeTemplates([...templates, newTemplate]);
    onSelect(newTemplate.id);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="border-ink bg-card text-ink flex items-center gap-2 border-2 px-3 py-2 font-mono text-[0.8rem] font-bold transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[2px] active:shadow-none"
      >
        <span className="font-normal opacity-60">Instructions:</span>
        {selectedTemplate?.name || 'None'}
        <ChevronDown size={14} className="ml-1 opacity-60" />
      </button>

      {isOpen && (
        <div className="bg-bg border-ink animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 flex w-[300px] flex-col border-[3px] py-2 shadow-[4px_4px_0_var(--ink)] duration-200">
          <div className="text-ink px-4 py-2 font-mono text-[0.7rem] tracking-[0.1em] uppercase opacity-60">
            Summary instructions
          </div>

          <div className="flex flex-col">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group hover:bg-ink/10 text-ink relative flex cursor-pointer items-center justify-between px-4 py-2 text-[0.9rem] font-bold"
                onClick={() => {
                  onSelect(template.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <TemplateIcon icon={template.icon} className="shrink-0 opacity-70" />
                  <span className="truncate pr-16">{template.name}</span>
                  {template.isDefault && (
                    <span className="bg-ink/10 shrink-0 px-1.5 py-0.5 font-mono text-[0.65rem] uppercase opacity-60">
                      Default
                    </span>
                  )}
                </div>

                {selectedId === template.id && (
                  <span className="text-accent absolute right-4">
                    <Check size={14} />
                  </span>
                )}

                <div className="bg-bg border-ink absolute right-2 flex items-center gap-1 border-2 p-1 opacity-0 shadow-[2px_2px_0_var(--ink)] transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => handleEdit(e, template)}
                    className="hover:bg-ink/10 hover:text-accent p-1 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => handleSetDefault(e, template.id)}
                    className="hover:bg-ink/10 hover:text-accent p-1 transition-colors"
                    title="Set as default"
                  >
                    <Pin size={14} />
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={(e) => handleRemove(e, template.id)}
                      className="hover:bg-ink/10 p-1 transition-colors hover:text-[#E53935]"
                      title="Remove from my menu"
                    >
                      <MinusCircle size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-ink/20 mx-4 my-2 h-px" />

          <button
            onClick={() => {
              setIsOpen(false);
              setTemplateToEdit(null);
              setIsModalOpen(true);
            }}
            className="hover:bg-ink/10 text-ink flex items-center gap-3 px-4 py-2 text-[0.9rem] font-bold transition-colors"
          >
            <div className="flex w-4 justify-center">
              <Plus size={16} className="text-accent" />
            </div>
            Add custom instructions
          </button>
        </div>
      )}

      <CustomInstructionModal
        isOpen={isModalOpen}
        initialData={templateToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setTemplateToEdit(null);
        }}
        onSave={handleSaveCustom}
      />
    </div>
  );
}
