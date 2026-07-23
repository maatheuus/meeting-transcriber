import { formatMeetingDate } from '@renderer/lib/utils';
import type { Meeting } from '@renderer/types';
import { Mic, Plus } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  idle: 'Not started',
  recording: 'Recording',
  transcribing: 'Transcribing',
  complete: 'Complete',
};

export function HomeView({
  meetings,
  onSelectMeeting,
  onAddMeeting,
}: {
  meetings: Meeting[];
  onSelectMeeting: (id: string) => void;
  onAddMeeting: () => void;
}): React.JSX.Element {
  return (
    <main className="h-full min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(var(--ink-faint)_1px,transparent_1px)] [background-size:32px_32px] px-6 py-8 sm:px-10 lg:px-16 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 lg:mb-12">
        <div className="min-w-0">
          <h1 className="font-display text-ink text-[clamp(2.75rem,8vw,5rem)] leading-[0.85] break-words">
            Transcriber*
          </h1>
          <p className="mt-4 font-mono text-[0.75rem] tracking-[0.1em] uppercase opacity-60">
            {meetings.length} meeting{meetings.length === 1 ? '' : 's'} in your archive
          </p>
        </div>
        <button
          onClick={onAddMeeting}
          className="bg-accent font-display border-ink flex shrink-0 items-center gap-2 border-[3px] px-6 py-4 text-2xl text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
        >
          <Plus size={20} /> Start New
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="border-ink/30 flex flex-col items-center border-[3px] border-dashed p-10 text-center sm:p-16 lg:p-20">
          <Mic size={48} className="mb-6 opacity-30" />
          <h2 className="font-display text-ink mb-3 text-4xl">No meetings yet</h2>
          <p className="text-ink-muted mb-8 max-w-md">
            Start a new transcription and it will open in its own screen, where you can record, edit
            the transcript and generate a summary.
          </p>
          <button
            onClick={onAddMeeting}
            className="bg-accent border-ink border-2 px-6 py-3 font-bold text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
          >
            Start your first transcription
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 pb-12">
          {meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMeeting(m.id)}
              className="bg-card border-ink border-[3px] p-5 text-left shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)]"
            >
              {m.coverImage && (
                <img
                  src={m.coverImage}
                  alt=""
                  className="border-ink mb-3 h-24 w-full border-2 object-cover"
                />
              )}
              <div className="text-ink mb-1 truncate text-[1.05rem] font-bold">{m.title}</div>
              <div className="text-ink-muted font-mono text-[0.65rem] tracking-[0.1em] uppercase">
                {formatMeetingDate(m.createdAt)}
              </div>
              <div className="text-accent mt-2 font-mono text-[0.65rem] tracking-[0.1em] uppercase">
                {STATUS_LABEL[m.status || 'idle']}
                {m.segmentCount ? ` // ${m.segmentCount} segments` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
