import { Calendar, Copy, Mail, Mic } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAudioCapture } from '../../hooks/use-audio-capture';
import { Button } from '../ui/button';
import { TranscriptBadge } from './transcript-badge';

const MOCK_SUMMARY = [
  { text: 'Discussed the new architecture for the audio capture using Electron 39+', ids: [1, 2] },
  { text: 'Agreed to use a cloud API for transcription MVP to save time on diarization', ids: [3] },
  { text: 'Decided to start with SQLite for local storage to keep it offline-first', ids: [4] },
];

const MOCK_TRANSCRIPT = [
  {
    id: 1,
    speaker: 'Matheus',
    time: '00:01',
    text: 'So, the new architecture. Electron 39 now supports capturing system audio without external drivers.',
  },
  {
    id: 2,
    speaker: 'AI',
    time: '00:15',
    text: 'Yes, the CoreAudio Tap API makes loopback seamless on macOS 13+.',
  },
  {
    id: 3,
    speaker: 'Matheus',
    time: '00:25',
    text: "For transcription, let's use a cloud API for the MVP so we get speaker diarization easily.",
  },
  {
    id: 4,
    speaker: 'AI',
    time: '00:40',
    text: 'Makes sense. And we should use SQLite to store everything locally.',
  },
];

export function TabsView() {
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'transcript'>('summary');
  const transcriptRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const { isRecording, startRecording, stopRecording } = useAudioCapture();

  const scrollToTranscript = (id: number) => {
    setActiveTab('transcript');
    setTimeout(() => {
      const el = transcriptRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-accent/30');
        setTimeout(() => el.classList.remove('bg-accent/30'), 2000);
      }
    }, 100);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-border border-b px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-2">
            <Calendar size={18} />
            <span className="text-sm">Today, 2:00 PM</span>
          </div>
          <Button
            variant={isRecording ? 'destructive' : 'default'}
            size="sm"
            className="gap-2 rounded-full px-4"
            onClick={isRecording ? stopRecording : startRecording}
          >
            <Mic size={16} /> {isRecording ? 'Stop Recording' : 'Record New'}
          </Button>
        </div>
        <h1 className="font-display mb-6 text-3xl font-semibold">Project Planning Sync</h1>

        <div className="border-border flex gap-6 border-b">
          <button
            onClick={() => setActiveTab('summary')}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'summary' ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'notes' ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('transcript')}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === 'transcript' ? 'border-primary text-foreground' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
          >
            Transcript
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'summary' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 max-w-3xl duration-500">
            <div className="bg-card border-border mb-8 flex items-center justify-between rounded-lg border p-3">
              <span className="px-2 text-sm font-medium">Share this summary</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Copy size={14} /> Copy link
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Mail size={14} /> Email
                </Button>
              </div>
            </div>

            <h2 className="font-display mb-4 text-xl font-semibold">Key Themes</h2>
            <ul className="space-y-3">
              {MOCK_SUMMARY.map((item, idx) => (
                <li key={idx} className="text-foreground/90 text-base leading-relaxed">
                  • {item.text}
                  {item.ids.map((id) => (
                    <TranscriptBadge key={id} id={id} onClick={scrollToTranscript} />
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 text-muted-foreground max-w-3xl italic duration-500">
            No manual notes taken during this meeting.
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 max-w-3xl space-y-6 pb-12 duration-500">
            {MOCK_TRANSCRIPT.map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  transcriptRefs.current[item.id] = el;
                }}
                className="flex gap-4 rounded-lg p-3 transition-colors"
              >
                <div className="text-muted-foreground w-16 shrink-0 pt-1 font-mono text-sm">
                  {item.time}
                </div>
                <div>
                  <div className="mb-1 text-sm font-semibold">
                    {item.speaker}{' '}
                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                      [{item.id}]
                    </span>
                  </div>
                  <div className="text-foreground/90 text-base leading-relaxed">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
