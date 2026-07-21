interface TranscriptBadgeProps {
  id: number;
  onClick: (id: number) => void;
}

export function TranscriptBadge({ id, onClick }: TranscriptBadgeProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className="bg-muted hover:bg-accent hover:text-accent-foreground text-muted-foreground border-border ml-1 inline-flex cursor-pointer items-center justify-center rounded-full border px-2 py-0.5 align-middle font-mono text-xs transition-colors"
    >
      {id}
    </button>
  );
}
