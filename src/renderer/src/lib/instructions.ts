export type InstructionSection = {
  id: number;
  title: string;
  instructions: string;
};

export type InstructionTemplate = {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
  context?: string;
  format?: InstructionSection[];
};

const STORAGE_KEY = 'summary_instructions';

export const DEFAULT_TEMPLATES: InstructionTemplate[] = [
  { id: 'auto', name: 'Auto', icon: 'sparkles', isDefault: true },
  { id: 'candidate', name: 'Candidate Interview', icon: 'briefcase' },
  { id: 'customer', name: 'Customer Call', icon: 'phone' },
  { id: 'standup', name: 'Stand-Up', icon: 'users' },
  { id: 'person', name: 'Meeting with a person', icon: 'file' },
];

export function loadTemplates(): InstructionTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as InstructionTemplate[]) : null;
    return parsed?.length ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(templates: InstructionTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/** Turns a template into the instruction block appended to the summary prompt. */
export function templateToPrompt(template: InstructionTemplate): string {
  const parts = [`Summary style: ${template.name}.`];

  if (template.context) parts.push(`Context: ${template.context}`);

  const sections = template.format?.filter((s) => s.title || s.instructions) || [];
  if (sections.length) {
    parts.push(
      'Use exactly these sections:\n' +
        sections.map((s) => `- ${s.title || 'Section'}: ${s.instructions}`).join('\n'),
    );
  }

  return parts.join('\n');
}
