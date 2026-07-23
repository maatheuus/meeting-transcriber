import { getDb } from '../db/connection';

export type TemplateSection = { id: number; title: string; instructions: string };

export type TemplateDTO = {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
  isBuiltin?: boolean;
  context?: string;
  format?: TemplateSection[];
};

const BUILTIN_TEMPLATES: TemplateDTO[] = [
  { id: 'auto', name: 'Auto', icon: 'sparkles', isDefault: true },
  { id: 'candidate', name: 'Candidate Interview', icon: 'briefcase' },
  { id: 'customer', name: 'Customer Call', icon: 'phone' },
  { id: 'standup', name: 'Stand-Up', icon: 'users' },
  { id: 'person', name: 'Meeting with a person', icon: 'file' },
];

type TemplateRow = {
  id: string;
  name: string;
  icon: string;
  instructions: string | null;
  is_default: number;
  is_builtin: number;
};

function toDTO(row: TemplateRow): TemplateDTO {
  let body: { context?: string; format?: TemplateSection[] } = {};
  try {
    body = row.instructions ? JSON.parse(row.instructions) : {};
  } catch {
    body = {};
  }

  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    ...(row.is_default ? { isDefault: true } : {}),
    ...(row.is_builtin ? { isBuiltin: true } : {}),
    ...(body.context ? { context: body.context } : {}),
    ...(body.format?.length ? { format: body.format } : {}),
  };
}

export function list(): TemplateDTO[] {
  const rows = getDb()
    .prepare(
      'SELECT id, name, icon, instructions, is_default, is_builtin FROM templates ' +
        'ORDER BY position, rowid',
    )
    .all() as TemplateRow[];
  return rows.map(toDTO);
}

/**
 * The menu edits the whole list at once (add, edit, remove, set default), so the
 * simplest faithful mapping is to rewrite the table in a single transaction.
 */
export function replaceAll(templates: TemplateDTO[]): TemplateDTO[] {
  const db = getDb();

  const write = db.transaction(() => {
    db.exec('DELETE FROM templates');
    const insert = db.prepare(
      'INSERT INTO templates (id, name, icon, instructions, is_default, is_builtin, position) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
    );

    templates.forEach((template, index) => {
      const body = JSON.stringify({ context: template.context, format: template.format });
      insert.run(
        template.id,
        template.name,
        template.icon || 'file',
        body,
        template.isDefault ? 1 : 0,
        BUILTIN_TEMPLATES.some((b) => b.id === template.id) ? 1 : 0,
        index,
      );
    });
  });

  write();
  return list();
}

/** Seeds the built-in templates the first time the table is empty. */
export function seedIfEmpty(): void {
  const { count } = getDb().prepare('SELECT count(*) AS count FROM templates').get() as {
    count: number;
  };
  if (count === 0) replaceAll(BUILTIN_TEMPLATES);
}
