import { Modal } from '@renderer/components/ui/modal';
import { loadTemplates, saveTemplates, type InstructionTemplate } from '@renderer/lib/instructions';
import {
  BookOpen,
  Briefcase,
  Check,
  ChevronLeft,
  Coffee,
  Cpu,
  FileText,
  Pencil,
  Phone,
  Pin,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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

const ICON_LIST = Object.keys(ICONS);

function TemplateIcon({
  icon,
  size = 16,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[icon] || FileText;
  return <Icon size={size} className={className} />;
}

type EditorState = { name: string; icon: string; prompt: string };

function emptyEditor(): EditorState {
  return { name: '', icon: 'custom', prompt: '' };
}

function templateToEditor(t: InstructionTemplate): EditorState {
  return { name: t.name, icon: t.icon, prompt: t.prompt || '' };
}

export function InstructionsManagerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // template id, or 'new'
  const [editor, setEditor] = useState<EditorState>(emptyEditor());

  // Reload fresh from cache every time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setTemplates(loadTemplates());
    setEditing(null);
    setEditor(emptyEditor());
  }, [isOpen]);

  const persist = (next: InstructionTemplate[]) => {
    setTemplates(next);
    saveTemplates(next);
  };

  const handleEdit = (t: InstructionTemplate) => {
    setEditing(t.id);
    setEditor(templateToEditor(t));
  };

  const handleNew = () => {
    setEditing('new');
    setEditor(emptyEditor());
  };

  const handleSaveEditor = () => {
    const name = editor.name.trim() || 'Untitled';
    if (editing === 'new') {
      const newT: InstructionTemplate = {
        id: `custom_${Date.now()}`,
        name,
        icon: editor.icon,
        prompt: editor.prompt.trim(),
      };
      persist([...templates, newT]);
    } else {
      persist(
        templates.map((t) =>
          t.id === editing ? { ...t, name, icon: editor.icon, prompt: editor.prompt.trim() } : t,
        ),
      );
    }
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    const remaining = templates.filter((t) => t.id !== id);
    persist(remaining);
  };

  const handleSetDefault = (id: string) => {
    persist(templates.map((t) => ({ ...t, isDefault: t.id === id })));
  };

  const isNew = editing === 'new';
  const editingTemplate = !isNew && editing ? templates.find((t) => t.id === editing) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-3xl">
      <div className="border-ink bg-bg flex max-h-[90vh] w-full flex-col overflow-hidden border-[3px] shadow-[8px_8px_0_var(--ink)]">
        {/* Header */}
        <div className="border-ink flex shrink-0 items-center justify-between gap-4 border-b-[3px] px-6 py-4">
          <div className="flex items-center gap-3">
            {editing && (
              <button
                onClick={() => setEditing(null)}
                className="text-ink/60 hover:text-ink mr-1 transition-colors"
                title="Back to list"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <BookOpen size={18} className="text-ink/70" />
            <h2 className="font-display text-ink text-[1.2rem] font-bold">
              {editing
                ? isNew
                  ? 'New Instruction'
                  : `Edit — ${editingTemplate?.name || ''}`
                : 'My Instructions'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <button
                onClick={handleSaveEditor}
                className="bg-accent border-ink flex items-center gap-2 border-2 px-4 py-1.5 text-[0.85rem] font-bold text-white shadow-[2px_2px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)]"
              >
                <Check size={14} />
                Save
              </button>
            ) : (
              <button
                onClick={handleNew}
                className="border-ink flex items-center gap-2 border-2 px-4 py-1.5 text-[0.85rem] font-bold shadow-[2px_2px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)]"
              >
                <Plus size={14} />
                New
              </button>
            )}
            <button
              onClick={onClose}
              className="text-ink/50 hover:text-ink p-1 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {editing ? (
            /* ── Editor ── */
            <div className="space-y-8 p-8">
              {/* Icon + Name row */}
              <div className="flex items-center gap-4">
                {/* Icon picker */}
                <div className="shrink-0">
                  <p className="text-ink mb-2 font-mono text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-60">
                    Icon
                  </p>
                  <div className="border-ink grid w-fit grid-cols-5 gap-1.5 border-2 p-2">
                    {ICON_LIST.map((id) => (
                      <button
                        key={id}
                        onClick={() => setEditor({ ...editor, icon: id })}
                        title={id}
                        className={`flex items-center justify-center rounded p-2 transition-colors ${
                          editor.icon === id
                            ? 'bg-accent text-white'
                            : 'text-ink/60 hover:bg-ink/10 hover:text-ink'
                        }`}
                      >
                        <TemplateIcon icon={id} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="flex-1">
                  <label className="text-ink mb-2 block font-mono text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-60">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    className="bg-card border-ink focus:border-accent w-full border-2 p-3 text-[1.1rem] font-bold outline-none placeholder:opacity-30"
                    placeholder="e.g. Weekly Sync"
                    autoFocus
                  />
                </div>
              </div>

              {/* Prompt textarea */}
              <div>
                <label className="text-ink mb-2 block font-mono text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-60">
                  Instructions (Markdown supported)
                </label>
                <textarea
                  value={editor.prompt}
                  onChange={(e) => setEditor({ ...editor, prompt: e.target.value })}
                  rows={14}
                  className="bg-card border-ink focus:border-accent w-full resize-y border-2 p-4 font-mono text-[0.9rem] leading-relaxed outline-none placeholder:opacity-30"
                  placeholder={`Describe how the AI should summarize this meeting.\n\nExample:\nWrite a summary for a weekly engineering sync.\n- Start with a 2-sentence TL;DR\n- List action items as checkboxes\n- Include decisions and blockers`}
                />
                <p className="text-ink/40 mt-2 font-mono text-[0.7rem]">
                  This text is appended verbatim to the summary prompt. Markdown formatting is
                  respected.
                </p>
              </div>
            </div>
          ) : (
            /* ── List ── */
            <div>
              {templates.length === 0 ? (
                <div className="flex flex-col items-center gap-4 p-16 text-center">
                  <BookOpen size={40} className="text-ink/20" />
                  <p className="text-ink/40 font-mono text-[0.85rem]">No instructions yet.</p>
                  <button
                    onClick={handleNew}
                    className="bg-accent border-ink flex items-center gap-2 border-2 px-5 py-2 font-bold text-white shadow-[2px_2px_0_var(--ink)]"
                  >
                    <Plus size={14} /> Create your first instruction
                  </button>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-ink border-b-[3px]">
                      <th className="text-ink/50 px-6 py-3 text-left font-mono text-[0.65rem] tracking-[0.1em] uppercase">
                        Name
                      </th>
                      <th className="text-ink/50 px-4 py-3 text-left font-mono text-[0.65rem] tracking-[0.1em] uppercase">
                        Preview
                      </th>
                      <th className="text-ink/50 w-28 px-4 py-3 text-right font-mono text-[0.65rem] tracking-[0.1em] uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((t) => (
                      <tr
                        key={t.id}
                        className="border-ink/20 hover:bg-ink/5 group border-b transition-colors"
                      >
                        {/* Name + icon + default badge */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <TemplateIcon
                              icon={t.icon}
                              size={15}
                              className="text-ink/60 shrink-0"
                            />
                            <span className="text-ink text-[0.9rem] font-bold">{t.name}</span>
                            {t.isDefault && (
                              <span className="bg-accent/15 text-accent shrink-0 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase">
                                Default
                              </span>
                            )}
                            {t.isBuiltin && (
                              <span className="bg-ink/10 text-ink/50 shrink-0 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase">
                                Built-in
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Prompt preview */}
                        <td className="max-w-xs px-4 py-4">
                          <p className="text-ink/50 truncate font-mono text-[0.78rem]">
                            {t.prompt ? t.prompt.slice(0, 80) : '—'}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(t)}
                              title="Edit"
                              className="hover:bg-ink/10 hover:text-accent text-ink/50 rounded p-1.5 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleSetDefault(t.id)}
                              title={t.isDefault ? 'Already default' : 'Set as default'}
                              className={`rounded p-1.5 transition-colors ${
                                t.isDefault
                                  ? 'text-accent'
                                  : 'hover:bg-ink/10 hover:text-accent text-ink/50'
                              }`}
                            >
                              <Pin size={14} />
                            </button>
                            {!t.isDefault && (
                              <button
                                onClick={() => handleDelete(t.id)}
                                title="Delete"
                                className="text-ink/50 rounded p-1.5 transition-colors hover:bg-red-500/10 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
