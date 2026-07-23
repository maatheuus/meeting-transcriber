import { useEffect, useRef, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { msToTime, timeToSeconds } from '@renderer/lib/utils';
import type { TranscriptSegment, TranscriptSegmentInput } from '@renderer/types';

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  return text
    .split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    .map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-[#FFD54F] px-1 text-[#2D2926]">
          {part}
        </span>
      ) : (
        part
      ),
    );
}

/** Grows a textarea to fit its content so transcript editing feels inline. */
function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function TranscriptTab({
  segments,
  onUpdateSegment,
  onAddSegment,
  onRemoveSegment,
  onRenameSpeaker,
  isRecording,
  searchQuery = '',
  onSeek,
}: {
  segments: TranscriptSegment[];
  onUpdateSegment: (id: number, patch: TranscriptSegmentInput) => void;
  onAddSegment: (segment: TranscriptSegmentInput) => Promise<TranscriptSegment>;
  onRemoveSegment: (id: number) => void;
  onRenameSpeaker: (from: string, to: string) => void;
  isRecording?: boolean;
  searchQuery?: string;
  onSeek?: (seconds: number) => void;
}) {
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editingSpeakerId, setEditingSpeakerId] = useState<number | null>(null);
  // The timestamp is stored in milliseconds, so the "MM:SS" text is only kept
  // while a field is being typed into and parsed back when the user commits.
  const [timeDraft, setTimeDraft] = useState<{ id: number; value: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const renameSpeaker = (from: string, to: string) => {
    const name = to.trim();
    setEditingSpeakerId(null);
    if (!name || name === from) return;
    onRenameSpeaker(from, name);
  };

  const commitTime = (id: number, value: string) => {
    setTimeDraft(null);
    onUpdateSegment(id, { startMs: Math.round(timeToSeconds(value) * 1000) });
  };

  const addSegment = async () => {
    const last = segments[segments.length - 1];
    const startMs = last ? last.startMs + 5000 : 0;
    const created = await onAddSegment({
      speaker: last?.speaker || 'Speaker 1',
      startMs,
      text: '',
    });
    setEditingSegmentId(created.id);
  };

  useEffect(() => {
    if (isRecording) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [segments.length, isRecording]);

  const displaySegments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return segments;
    return segments.filter(
      (s) => s.text.toLowerCase().includes(query) || s.speaker.toLowerCase().includes(query),
    );
  }, [segments, searchQuery]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 bg-card border-ink space-y-6 border-[3px] p-8 duration-500">
      {segments.length === 0 ? (
        <div className="text-ink-muted py-10 text-center">
          <p className="mb-4 font-mono text-[0.8rem] tracking-[0.1em] uppercase">
            Transcript is empty
          </p>
          <p className="mb-6">Record the meeting, or add the first line yourself.</p>
          <button
            onClick={addSegment}
            className="bg-accent border-ink inline-flex items-center gap-2 border-2 px-5 py-2.5 font-bold text-white shadow-[2px_2px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)] active:translate-y-[2px] active:shadow-none"
          >
            <Plus size={16} /> Add a line
          </button>
        </div>
      ) : displaySegments.length === 0 ? (
        <div className="text-ink-muted py-8 text-center font-mono">
          No matches found for &quot;{searchQuery}&quot;
        </div>
      ) : (
        displaySegments.map((segment) => (
          <div key={segment.id} className="group flex gap-4">
            <div className="w-16 shrink-0 pt-0.5">
              <input
                value={timeDraft?.id === segment.id ? timeDraft.value : msToTime(segment.startMs)}
                onChange={(e) => setTimeDraft({ id: segment.id, value: e.target.value })}
                // Only writes when the field was actually typed into, so a
                // click that just seeks the player leaves the timestamp alone.
                onBlur={(e) =>
                  timeDraft?.id === segment.id
                    ? commitTime(segment.id, e.target.value)
                    : setTimeDraft(null)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setTimeDraft(null);
                }}
                onClick={() => onSeek?.(segment.startMs / 1000)}
                className="text-accent focus:border-accent w-full bg-transparent font-mono text-[0.8rem] underline outline-none focus:border-b-2 focus:no-underline"
                title={
                  onSeek
                    ? 'Click to jump the player here — edit to change the timestamp'
                    : 'Edit timestamp'
                }
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {editingSpeakerId === segment.id ? (
                <input
                  autoFocus
                  defaultValue={segment.speaker}
                  onBlur={(e) => renameSpeaker(segment.speaker, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setEditingSpeakerId(null);
                  }}
                  className="border-accent text-accent mb-1 block border-b-2 bg-transparent p-0 font-mono text-[0.75rem] font-bold uppercase outline-none"
                />
              ) : (
                <span
                  className="text-ink-muted hover:bg-accent/10 hover:text-accent -ml-1 inline-block cursor-pointer px-1 font-mono text-[0.75rem] font-bold uppercase transition-colors"
                  onClick={() => setEditingSpeakerId(segment.id)}
                  title="Click to rename speaker"
                >
                  {highlightText(segment.speaker, searchQuery)}
                </span>
              )}

              {editingSegmentId === segment.id ? (
                <textarea
                  autoFocus
                  ref={autoResize}
                  value={segment.text}
                  onChange={(e) => {
                    autoResize(e.target);
                    onUpdateSegment(segment.id, { text: e.target.value });
                  }}
                  onBlur={() => setEditingSegmentId(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingSegmentId(null);
                  }}
                  placeholder="Type what was said…"
                  className="border-accent w-full resize-none border-b-2 bg-transparent text-[1.1rem] leading-relaxed font-medium outline-none"
                />
              ) : (
                <p
                  className="hover:bg-ink/5 -mx-1 min-h-[1.6rem] cursor-text px-1 text-[1.1rem] leading-relaxed font-medium"
                  onClick={() => setEditingSegmentId(segment.id)}
                  title="Click to edit"
                >
                  {segment.text ? (
                    highlightText(segment.text, searchQuery)
                  ) : (
                    <span className="text-ink-muted italic">Empty line — click to write.</span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={() => onRemoveSegment(segment.id)}
              className="text-ink-muted h-6 shrink-0 p-1 opacity-0 transition-all group-hover:opacity-100 hover:text-[#E53935]"
              title="Delete line"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}

      {segments.length > 0 && !searchQuery && (
        <button
          onClick={addSegment}
          className="text-ink-muted hover:text-accent flex items-center gap-2 pt-2 font-mono text-[0.75rem] tracking-[0.1em] uppercase transition-colors"
        >
          <Plus size={14} /> Add line
        </button>
      )}

      {isRecording && (
        <div className="text-ink-muted flex items-center gap-2 py-4 font-mono text-[0.8rem]">
          <div className="bg-accent h-2 w-2 animate-pulse rounded-full" />
          Recording — the transcript is generated when you stop.
        </div>
      )}

      <div ref={bottomRef} className="h-1 w-full" />
    </div>
  );
}
