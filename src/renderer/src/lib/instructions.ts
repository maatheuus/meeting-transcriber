export type InstructionTemplate = {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
  isBuiltin?: boolean;
  prompt?: string;
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

export function templateToPrompt(template: InstructionTemplate): string {
  const parts = [`Summary style: ${template.name}.`];

  if (template.prompt) parts.push(template.prompt);

  return parts.join('\n\n');
}
