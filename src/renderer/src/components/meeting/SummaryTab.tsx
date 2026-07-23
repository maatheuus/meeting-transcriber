import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { SummaryInstructionsMenu } from './SummaryInstructionsMenu';
import {
  loadTemplates,
  saveTemplates,
  templateToPrompt,
  type InstructionTemplate,
} from '@renderer/lib/instructions';
import { loadSettings } from '@renderer/lib/settings';
import { msToTime } from '@renderer/lib/utils';
import type { Meeting, MeetingPatch, TranscriptSegment } from '@renderer/types';

export function SummaryTab({
  meeting,
  segments,
  onPatchMeeting,
}: {
  meeting: Meeting;
  segments: TranscriptSegment[];
  onPatchMeeting: (patch: MeetingPatch) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [templates, setTemplates] = useState<InstructionTemplate[]>(loadTemplates);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const selectedId =
    meeting.instruction || templates.find((t) => t.isDefault)?.id || templates[0]?.id || 'auto';
  const selectedTemplate = templates.find((t) => t.id === selectedId) || templates[0];

  const transcriptText = segments
    .map((s) => `[${msToTime(s.startMs)}] ${s.speaker}: ${s.text}`)
    .join('\n');

  const generateSummary = async () => {
    if (!transcriptText.trim()) {
      toast.error('Nothing to summarize yet — record or write a transcript first.');
      return;
    }

    setIsGenerating(true);
    try {
      const settings = loadSettings();
      const prompt = [
        `Summarize the following meeting titled "${meeting.title}".`,
        `Write the summary in ${meeting.language || 'en-US'}.`,
        templateToPrompt(selectedTemplate),
        'Include action items and key decisions when the transcript supports them. Use Markdown.',
        '',
        'TRANSCRIPT:',
        transcriptText,
      ].join('\n');

      const text = await window.api.gemini.chatThink({
        prompt,
        model: settings.summaryModel || undefined,
        apiKey: settings.apiKey || undefined,
      });

      onPatchMeeting({ summary: text });
      toast.success(`Summary generated with "${selectedTemplate.name}"`);
    } catch (err: any) {
      toast.error('Failed to generate summary: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-10 duration-500">
      <section className="bg-card border-ink relative border-[3px] p-8">
        <h2 className="bg-bg absolute -top-3 left-6 px-2 font-mono text-[0.75rem] uppercase">
          [01] AI_SUMMARY
        </h2>
        <div className="mb-2 flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1 text-[1.15rem] leading-[1.6] font-medium whitespace-pre-wrap">
            {meeting.summary || (
              <span className="text-ink-muted">
                No summary yet. Pick your instructions and hit generate — the current transcript is
                sent as context.
              </span>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <SummaryInstructionsMenu
              templates={templates}
              onChangeTemplates={setTemplates}
              selectedId={selectedId}
              onSelect={(id) => onPatchMeeting({ instruction: id })}
            />
            <button
              onClick={generateSummary}
              disabled={isGenerating}
              className="bg-accent border-ink flex w-full items-center justify-center gap-2 border-2 px-4 py-2 text-[0.9rem] font-bold text-white shadow-[2px_2px_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--ink)] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
            >
              <Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'GENERATING...' : 'GENERATE SUMMARY'}
            </button>
            <span className="font-mono text-[0.65rem] tracking-[0.1em] uppercase opacity-50">
              {segments.length} transcript lines
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
