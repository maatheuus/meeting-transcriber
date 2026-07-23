import type { Meeting } from '@renderer/types';

export function NotesTab({
  meeting,
  onPatchMeeting,
}: {
  meeting: Meeting;
  onPatchMeeting: (patch: Partial<Meeting>) => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 bg-card border-ink h-full border-[3px] p-8 duration-500">
      <textarea
        className="placeholder:text-ink-muted/50 h-full min-h-[400px] w-full resize-none bg-transparent font-sans text-[1.1rem] leading-relaxed font-medium outline-none"
        placeholder="Start typing your notes here..."
        value={meeting.notes || ''}
        onChange={(e) => onPatchMeeting({ notes: e.target.value })}
      />
    </div>
  );
}
