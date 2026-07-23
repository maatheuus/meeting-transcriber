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
  isBuiltin?: boolean;
  context?: string;
  format?: InstructionSection[];
};

/**
 * Templates live in the `templates` table. The menu edits the whole list at
 * once, so the cache below mirrors the table and every save rewrites it.
 */
let cache: InstructionTemplate[] = [];

export async function hydrateTemplates(): Promise<void> {
  cache = await window.api.templates.list();
}

export function loadTemplates(): InstructionTemplate[] {
  return cache;
}

export function saveTemplates(templates: InstructionTemplate[]): void {
  cache = templates;
  window.api.templates
    .replaceAll(templates)
    .catch((e) => console.error('Failed to save summary templates', e));
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
