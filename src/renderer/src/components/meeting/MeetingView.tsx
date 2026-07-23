import { Modal } from '@renderer/components/ui/modal';
import { loadSettings } from '@renderer/lib/settings';
import { cn } from '@renderer/lib/utils';
import { audioService, getRecording, setRecording } from '@renderer/services/audio';
import type { Meeting, TranscriptSegment } from '@renderer/types';
import {
  ArrowLeft,
  Camera,
  Copy,
  FolderOpen,
  HelpCircle,
  Mic,
  Pause,
  Play,
  Save,
  Search,
  SkipBack,
  SkipForward,
  Square,
  Tag,
  Volume2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MeetingLanguageMenu } from './MeetingLanguageMenu';
import { NotesTab } from './NotesTab';
import { SummaryTab } from './SummaryTab';
import { TranscriptTab } from './TranscriptTab';

type TabType = 'summary' | 'notes' | 'transcript';
type RecordState = 'idle' | 'recording' | 'paused';

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

/** "MM:SS" (or "HH:MM:SS") -> seconds. */
function timeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

/**
 * The model is asked for a JSON array of turns; fall back to one plain segment.
 * `offsetSeconds` is the recorded time already accumulated before this chunk, so
 * every turn is shifted onto the meeting's continuous timeline (absolute offset).
 */
function parseTranscript(raw: string, offsetSeconds = 0): TranscriptSegment[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const shift = (rawTime: string): { time: string; offsetMs: number } => {
    const abs = offsetSeconds + timeToSeconds(rawTime);
    return { time: formatDuration(abs), offsetMs: Math.round(abs * 1000) };
  };

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item, i) => {
        const { time, offsetMs } = shift(typeof item.time === 'string' ? item.time : '00:00');
        return {
          id: `${Date.now()}_${i}`,
          speaker: typeof item.speaker === 'string' ? item.speaker : 'Speaker 1',
          time,
          offsetMs,
          text: typeof item.text === 'string' ? item.text : String(item),
        };
      });
    }
  } catch {
    // Not JSON — keep the raw text as a single segment.
  }

  return [
    {
      id: `${Date.now()}_0`,
      speaker: 'Speaker 1',
      time: formatDuration(offsetSeconds),
      offsetMs: Math.round(offsetSeconds * 1000),
      text: cleaned,
    },
  ];
}

export function MeetingView({
  meeting,
  onUpdateMeeting,
  onBack,
}: {
  meeting: Meeting;
  onUpdateMeeting: (m: Meeting) => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(meeting.durationSeconds || 0);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>([10, 10, 10, 10, 10, 10]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(() => getRecording(meeting.id));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [editFolderValue, setEditFolderValue] = useState(meeting.folder || '');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editTagsValue, setEditTagsValue] = useState(meeting.tags?.join(', ') || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(meeting.title);

  const contentRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // `meeting` gets a new identity on every edit, so keep a ref for callbacks
  // that must not be rebuilt (keyboard handlers, timers, async completions).
  const meetingRef = useRef(meeting);
  meetingRef.current = meeting;

  // Recorded time already banked before the current session starts. Every turn
  // this session produces is shifted by this so the timeline stays continuous.
  const sessionOffsetRef = useRef(0);

  const patchMeeting = useCallback(
    (patch: Partial<Meeting>) => onUpdateMeeting({ ...meetingRef.current, ...patch }),
    [onUpdateMeeting],
  );

  useEffect(() => {
    if (recordState !== 'recording') return;
    const id = setInterval(() => setDurationSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, [recordState]);

  // Real mic level feeds both the in-app bars and the floating overlay pill.
  useEffect(() => {
    if (recordState === 'idle') {
      setAudioLevels([10, 10, 10, 10, 10, 10]);
      window.api.recording.setState({ state: 'idle', level: 0 });
      return;
    }
    const id = setInterval(() => {
      const level = recordState === 'recording' ? audioService.getLevel() : 0;
      setAudioLevels((prev) => [...prev.slice(1), Math.max(10, level)]);
      window.api.recording.setState({ state: recordState, level });
    }, 120);
    return () => clearInterval(id);
  }, [recordState]);

  // A ref keeps the overlay command handlers current without re-subscribing every render.
  const commandRef = useRef<(cmd: 'pause' | 'resume' | 'stop' | 'capture') => void>(() => {});
  useEffect(() => {
    const off = window.api.recording.onCommand((cmd) => commandRef.current(cmd));
    return off;
  }, []);
  useEffect(() => {
    return () => window.api.overlay.hide();
  }, []);

  useEffect(() => {
    if (!isCopyMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isCopyMenuOpen]);

  const handleCopyMarkdown = () => {
    if (!contentRef.current) return;
    navigator.clipboard.writeText(`# ${meeting.title}\n\n${contentRef.current.innerText}`);
    setIsCopyMenuOpen(false);
    toast.success('Copied as Markdown');
  };

  const handleCopyPlainText = () => {
    if (!contentRef.current) return;
    navigator.clipboard.writeText(contentRef.current.innerText);
    setIsCopyMenuOpen(false);
    toast.success('Copied as Plain Text');
  };

  const transcribe = (audioBlob: Blob, offsetSeconds: number) => {
    const settings = loadSettings();
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64data = (reader.result as string).split(',')[1];
      try {
        const knownSpeakers = Array.from(
          new Set((meetingRef.current.transcript || []).map((s) => s.speaker).filter(Boolean)),
        );

        const text = await window.api.gemini.transcribe({
          audioBase64: base64data,
          mimeType: audioBlob.type,
          model: settings.transcribeModel || undefined,
          language: meetingRef.current.language,
          apiKey: settings.apiKey || undefined,
          knownSpeakers: knownSpeakers.length ? knownSpeakers : undefined,
        });

        patchMeeting({
          transcript: [
            ...(meetingRef.current.transcript || []),
            ...parseTranscript(text || '', offsetSeconds),
          ],
          status: 'complete',
        });
        setLastSaved(new Date());
        toast.success('Transcription complete');
      } catch (err: any) {
        patchMeeting({ status: 'complete' });
        toast.error('Transcription failed: ' + err.message);
      }
    };

    reader.readAsDataURL(audioBlob);
  };

  const handleStart = async () => {
    try {
      // Any turns from this session are shifted past the time already recorded.
      sessionOffsetRef.current = durationSeconds;
      await audioService.startRecording();
      setRecordState('recording');
      patchMeeting({ status: 'recording' });
      window.api.overlay.show();
      toast.success('Recording started');
    } catch (e: any) {
      const denied = /permission/i.test(e?.message || '');
      toast.error(denied ? 'Microphone permission denied.' : 'Could not start recording');
    }
  };

  const handlePause = () => {
    audioService.pauseRecording();
    setRecordState('paused');
  };

  const handleResume = () => {
    audioService.resumeRecording();
    setRecordState('recording');
  };

  const handleStop = async () => {
    try {
      const audioBlob = await audioService.stopRecording();
      setRecordState('idle');
      window.api.overlay.hide();

      const offsetSeconds = sessionOffsetRef.current;
      // Accurate accumulated recorded length from the monotonic clock.
      const totalSeconds = Math.round(offsetSeconds + audioService.getElapsedMs() / 1000);
      setDurationSeconds(totalSeconds);

      const meetingId = meetingRef.current.id;
      setAudioUrl(setRecording(meetingId, audioBlob));

      // Flush the final recording to disk so it survives a reload.
      let audioPath: string | undefined;
      try {
        audioPath = await window.api.audio.save({
          meetingId,
          mimeType: audioBlob.type,
          data: await audioBlob.arrayBuffer(),
        });
      } catch (e) {
        console.error('Failed to persist recording to disk', e);
      }

      patchMeeting({
        status: 'transcribing',
        durationSeconds: totalSeconds,
        ...(audioPath ? { audioPath } : {}),
      });
      setLastSaved(new Date());
      toast.success('Recording saved. Transcribing…');

      transcribe(audioBlob, offsetSeconds);
    } catch {
      toast.error('Failed to stop recording');
    }
  };

  // Keep the overlay command handler pointing at the latest closures.
  commandRef.current = (cmd) => {
    if (cmd === 'pause') handlePause();
    else if (cmd === 'resume') handleResume();
    else if (cmd === 'stop') handleStop();
    else if (cmd === 'capture') captureScreenshot();
  };

  const captureScreenshot = async () => {
    try {
      const res = await window.api.screenshot.region();
      if (res.supported) {
        if (res.dataUrl) {
          patchMeeting({ coverImage: res.dataUrl });
          toast.success('Screenshot set as cover image');
        }
        return;
      }
    } catch (err: any) {
      toast.error('Failed to capture screenshot: ' + (err?.message || 'unknown error'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

      patchMeeting({ coverImage: canvas.toDataURL('image/jpeg', 0.5) });
      track.stop();
      toast.success('Screenshot set as cover image');
    } catch (err: any) {
      const denied = /permission/i.test(err?.message || '');
      toast.error(denied ? 'Screen capture permission denied.' : 'Failed to capture screenshot');
    }
  };

  useEffect(() => {
    if (recordState !== 'recording') return;
    const interval = setInterval(() => {
      patchMeeting({ durationSeconds });
      setLastSaved(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, [recordState, durationSeconds, patchMeeting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return;

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (recordState === 'idle') handleStart();
        else handleStop();
      }
      if (key === 'p') {
        e.preventDefault();
        if (recordState === 'recording') handlePause();
        else if (recordState === 'paused') handleResume();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordState]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const max = audioDuration || (Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.currentTime = Math.min(Math.max(seconds, 0), max);
  };

  const seekFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * audioDuration);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, audioUrl]);

  // After a reload the in-memory blob is gone, so pull the persisted file from
  // disk and rebuild a blob URL the existing player can use unchanged.
  useEffect(() => {
    if (audioUrl || !meeting.audioPath) return;
    let cancelled = false;
    window.api.audio
      .load(meeting.audioPath)
      .then((res) => {
        if (cancelled || !res) return;
        const blob = new Blob([res.data as BlobPart], { type: res.mimeType });
        setAudioUrl(setRecording(meeting.id, blob));
      })
      .catch((e) => console.error('Failed to load recording from disk', e));
    return () => {
      cancelled = true;
    };
  }, [meeting.id, meeting.audioPath, audioUrl]);

  const hasRecording = Boolean(audioUrl);
  const progress = audioDuration ? (currentTime / audioDuration) * 100 : 0;
  const isBlank = !meeting.transcript?.length && recordState === 'idle' && !hasRecording;

  return (
    <main className="relative grid h-full min-w-0 flex-1 grid-rows-[auto_1fr_auto] bg-[radial-gradient(var(--ink-faint)_1px,transparent_1px)] [background-size:32px_32px]">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10 lg:px-16 lg:py-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={onBack}
            className="border-ink hover:bg-ink hover:text-bg flex items-center gap-2 border-2 px-3 py-1 font-mono text-[0.7rem] transition-colors"
            title="Back to all meetings"
          >
            <ArrowLeft size={12} /> ALL MEETINGS
          </button>
          <div className="bg-ink text-bg px-3 py-1 font-mono text-[0.7rem]">
            SESSION.{meeting.id.slice(-6).toUpperCase()}
          </div>
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="opacity-60 transition-opacity hover:opacity-100"
            title="Keyboard Shortcuts"
          >
            <HelpCircle size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {recordState !== 'idle' && (
            <div className="mr-2 flex h-4 items-end gap-1">
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="bg-accent w-1 transition-all duration-300"
                  style={{ height: `${level}%` }}
                />
              ))}
            </div>
          )}
          <div className="bg-accent flex min-w-[60px] items-center justify-center px-3 py-1 font-mono text-[0.7rem] text-white">
            {formatDuration(durationSeconds)}
          </div>
          <div className="relative" ref={copyMenuRef}>
            <button
              onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
              className="bg-ink text-bg hover:bg-ink/90 group flex h-full cursor-pointer items-center gap-2 px-3 py-1 font-mono text-[0.7rem] transition-colors"
            >
              <Copy size={12} className="group-hover:text-accent transition-colors" /> COPY
            </button>
            {isCopyMenuOpen && (
              <div className="bg-card border-ink animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-50 mt-2 flex w-48 flex-col border-[3px] shadow-[4px_4px_0_var(--ink)] duration-200">
                <button
                  onClick={handleCopyMarkdown}
                  className="text-ink hover:bg-accent border-ink border-b-2 px-4 py-3 text-left font-mono text-[0.75rem] font-bold transition-colors hover:text-white"
                >
                  Copy as Markdown
                </button>
                <button
                  onClick={handleCopyPlainText}
                  className="text-ink hover:bg-accent px-4 py-3 text-left font-mono text-[0.75rem] font-bold transition-colors hover:text-white"
                >
                  Copy as Plain Text
                </button>
              </div>
            )}
          </div>
          <button
            onClick={captureScreenshot}
            className="bg-ink text-bg hover:bg-ink/90 group flex cursor-pointer items-center gap-2 px-3 py-1 font-mono text-[0.7rem] transition-colors"
            title="Capture Screen for Cover Image"
          >
            <Camera size={12} className="group-hover:text-accent transition-colors" /> CAPTURE
          </button>
        </div>
      </header>

      {/* Main Content Area — extra bottom padding keeps content clear of the
          floating recording controls that overlap the player bar. */}
      <div className="overflow-y-auto px-6 pb-28 sm:px-10 lg:px-16">
        {isEditingTitle ? (
          <input
            autoFocus
            className="font-display text-ink border-accent mb-4 w-full max-w-[800px] border-b-4 bg-transparent text-[clamp(2.5rem,7vw,5rem)] leading-[0.85] outline-none"
            value={editTitleValue}
            onChange={(e) => setEditTitleValue(e.target.value)}
            onBlur={() => {
              setIsEditingTitle(false);
              patchMeeting({ title: editTitleValue.trim() || 'Untitled Meeting' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setEditTitleValue(meeting.title);
                setIsEditingTitle(false);
              }
            }}
          />
        ) : (
          <h1
            className="font-display text-ink mb-4 max-w-[800px] cursor-pointer text-[clamp(2.5rem,7vw,5rem)] leading-[0.85] break-words transition-opacity hover:opacity-80"
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit title"
          >
            {meeting.title}
          </h1>
        )}

        {meeting.coverImage && (
          <div className="border-ink mb-6 max-w-[400px] overflow-hidden border-[3px] shadow-[4px_4px_0_var(--ink)]">
            <img
              src={meeting.coverImage}
              alt="Meeting Cover"
              className="block h-auto w-full object-cover"
            />
          </div>
        )}

        <div className="text-ink mb-8 flex flex-wrap items-center gap-6 font-mono text-[0.7rem] tracking-[0.1em] uppercase">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="opacity-60" />
            {isEditingFolder ? (
              <input
                autoFocus
                value={editFolderValue}
                onChange={(e) => setEditFolderValue(e.target.value)}
                onBlur={() => {
                  setIsEditingFolder(false);
                  patchMeeting({ folder: editFolderValue.trim() || undefined });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="border-accent text-accent w-[100px] border-b-2 bg-transparent outline-none"
                placeholder="Folder name"
              />
            ) : (
              <span
                className="hover:text-accent cursor-pointer font-bold transition-colors"
                onClick={() => setIsEditingFolder(true)}
              >
                {meeting.folder || 'Uncategorized'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tag size={14} className="opacity-60" />
            {isEditingTags ? (
              <input
                autoFocus
                value={editTagsValue}
                onChange={(e) => setEditTagsValue(e.target.value)}
                onBlur={() => {
                  setIsEditingTags(false);
                  const tags = editTagsValue
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  patchMeeting({ tags: tags.length ? tags : undefined });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="border-accent text-accent w-[150px] border-b-2 bg-transparent outline-none"
                placeholder="tag1, tag2..."
              />
            ) : (
              <span
                className="hover:text-accent cursor-pointer font-bold transition-colors"
                onClick={() => setIsEditingTags(true)}
              >
                {meeting.tags?.length ? meeting.tags.join(', ') : 'Add tags...'}
              </span>
            )}
          </div>

          <MeetingLanguageMenu
            selectedId={meeting.language || 'en-US'}
            onSelect={(language) => patchMeeting({ language })}
          />
        </div>

        {isBlank && (
          <div className="border-ink/30 flex flex-col items-center border-[3px] border-dashed p-8 text-center sm:p-12 lg:p-16">
            <Mic size={40} className="mb-5 opacity-30" />
            <h2 className="font-display text-ink mb-2 text-4xl">Ready when you are</h2>
            <p className="text-ink-muted mb-6 max-w-md">
              Hit record to capture this meeting, or open the transcript tab and type it in by hand.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStart}
                className="bg-accent border-ink flex items-center gap-2 border-2 px-6 py-3 font-bold text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
              >
                <Mic size={16} /> Start recording
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className="border-ink hover:bg-ink hover:text-bg border-2 px-6 py-3 font-bold transition-colors"
              >
                Write it myself
              </button>
            </div>
          </div>
        )}

        <div className="mt-10 mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3 sm:gap-6">
            <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
              The Summary
            </TabButton>
            <TabButton active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>
              The Notes
            </TabButton>
            <TabButton
              active={activeTab === 'transcript'}
              onClick={() => setActiveTab('transcript')}
            >
              Full Transcript
            </TabButton>
          </div>

          {activeTab === 'transcript' && (
            <div className="bg-card border-ink flex items-center gap-2 border-[2px] px-3 py-1.5 shadow-[2px_2px_0_var(--ink)]">
              <Search size={14} className="opacity-60" />
              <input
                type="text"
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] bg-transparent text-[0.8rem] outline-none"
              />
            </div>
          )}
        </div>

        <div className="pb-8" ref={contentRef}>
          {activeTab === 'summary' && (
            <SummaryTab meeting={meeting} onPatchMeeting={patchMeeting} />
          )}
          {activeTab === 'notes' && <NotesTab meeting={meeting} onPatchMeeting={patchMeeting} />}
          {activeTab === 'transcript' && (
            <TranscriptTab
              meeting={meeting}
              onPatchMeeting={patchMeeting}
              isRecording={recordState === 'recording'}
              searchQuery={searchQuery}
              onSeek={hasRecording ? seekTo : undefined}
            />
          )}
        </div>
      </div>

      <div className="bg-bg border-ink relative flex flex-wrap items-center justify-between gap-4 border-t-[4px] px-6 py-6 sm:px-10 lg:gap-6 lg:px-16">
        <div className="bg-card border-ink absolute -top-20 left-1/2 flex -translate-x-1/2 items-center gap-3 border-[3px] p-2 shadow-[4px_4px_0_var(--ink)]">
          {recordState === 'idle' ? (
            <button
              onClick={handleStart}
              className="bg-accent border-ink flex h-10 w-10 items-center justify-center border-2 text-white transition-opacity hover:opacity-90"
              title="Start Recording (Cmd/Ctrl+Shift+S)"
            >
              <Mic size={18} />
            </button>
          ) : (
            <>
              <button
                onClick={recordState === 'recording' ? handlePause : handleResume}
                className="bg-accent border-ink flex h-10 w-10 items-center justify-center border-2 text-white transition-opacity hover:opacity-90"
                title={
                  recordState === 'recording'
                    ? 'Pause (Cmd/Ctrl+Shift+P)'
                    : 'Resume (Cmd/Ctrl+Shift+P)'
                }
              >
                {recordState === 'recording' ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} className="ml-1" />
                )}
              </button>
              <button
                onClick={handleStop}
                className="bg-ink text-bg border-ink hover:bg-ink/80 flex h-10 w-10 items-center justify-center border-2 transition-colors"
                title="Stop Recording (Cmd/Ctrl+Shift+S)"
              >
                <Square size={16} />
              </button>
            </>
          )}
          <button
            onClick={captureScreenshot}
            className="border-ink bg-card hover:bg-ink hover:text-bg flex h-10 w-10 items-center justify-center border-2 transition-colors"
            title="Capture Screen for Cover Image"
          >
            <Camera size={16} />
          </button>
          {recordState !== 'idle' && (
            <div className="text-accent flex items-center gap-2 px-3 font-mono text-[0.8rem] font-bold">
              <span
                className={`bg-accent h-2 w-2 rounded-full ${recordState === 'recording' ? 'animate-pulse' : 'opacity-50'}`}
              />
              {recordState === 'recording' ? 'RECORDING' : 'PAUSED'}
            </div>
          )}
          {lastSaved && (
            <div className="border-ink/10 flex items-center gap-1.5 border-l-2 px-3 pl-3 font-mono text-[0.7rem] opacity-60">
              <Save size={12} />
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              setAudioDuration(Number.isFinite(d) ? d : meeting.durationSeconds || 0);
            }}
            onDurationChange={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d)) setAudioDuration(d);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => seekTo(currentTime - 10)}
            disabled={!hasRecording}
            className="border-ink bg-card hover:bg-ink hover:text-bg flex h-10 w-10 items-center justify-center border-[3px] transition-colors disabled:opacity-30"
            title="Back 10s"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={togglePlay}
            disabled={!hasRecording}
            className="border-ink bg-accent flex h-14 w-14 cursor-pointer items-center justify-center border-[3px] shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            title={
              hasRecording ? (isPlaying ? 'Pause' : 'Play') : 'No recording loaded for this meeting'
            }
          >
            {isPlaying ? (
              <Pause fill="white" stroke="white" size={22} />
            ) : (
              <Play fill="white" stroke="white" size={24} className="ml-1" />
            )}
          </button>
          <button
            onClick={() => seekTo(currentTime + 10)}
            disabled={!hasRecording}
            className="border-ink bg-card hover:bg-ink hover:text-bg flex h-10 w-10 items-center justify-center border-[3px] transition-colors disabled:opacity-30"
            title="Forward 10s"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="min-w-[220px] flex-grow">
          <div
            className={cn(
              'bg-ink-faint border-ink relative h-3 border-2',
              hasRecording ? 'cursor-pointer' : 'opacity-50',
            )}
            onClick={hasRecording ? seekFromClick : undefined}
          >
            <div
              className="bg-accent border-ink h-full border-r-2"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-ink mt-2 flex justify-between font-mono text-[0.7rem] tracking-[0.1em] uppercase opacity-60">
            <span>{formatDuration(currentTime)} elapsed</span>
            <span>
              {hasRecording ? `${formatDuration(audioDuration)} total` : 'no recording saved'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2" title="Volume">
            <Volume2 size={14} className="opacity-60" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              disabled={!hasRecording}
              className="w-20 accent-[var(--accent)]"
            />
          </div>
          <button
            onClick={() =>
              setPlaybackRate(
                PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length],
              )
            }
            disabled={!hasRecording}
            className="border-ink hover:bg-ink hover:text-bg border-2 px-3 py-1.5 font-mono text-[0.7rem] transition-colors disabled:opacity-30"
            title="Playback speed"
          >
            {playbackRate}×
          </button>
        </div>
      </div>

      <Modal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        className="w-full max-w-md"
      >
        <div className="bg-card border-ink w-full border-[4px] p-6 shadow-[8px_8px_0_var(--ink)]">
          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="absolute top-4 right-4 transition-opacity hover:opacity-70"
          >
            <X size={20} />
          </button>
          <h2 className="font-display mb-6 text-3xl">Keyboard Shortcuts</h2>

          <div className="space-y-4">
            <ShortcutRow label="Start / Stop Recording" keys={['Cmd/Ctrl', 'Shift', 'S']} />
            <ShortcutRow label="Pause / Resume" keys={['Cmd/Ctrl', 'Shift', 'P']} />
          </div>

          <button
            onClick={() => setIsShortcutsOpen(false)}
            className="bg-ink text-bg mt-6 w-full py-3 text-sm font-bold tracking-wider uppercase transition-opacity hover:opacity-90"
          >
            Close
          </button>
        </div>
      </Modal>
    </main>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="border-ink/10 flex items-center justify-between border-b-2 pb-4">
      <span className="font-bold">{label}</span>
      <div className="flex items-center gap-1 font-mono text-[0.75rem]">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1">
            {i > 0 && <span>+</span>}
            <kbd className="bg-ink/5 border-ink border-2 px-2 py-1">{k}</kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'border-ink text-ink cursor-pointer border-2 px-4 py-2 font-mono text-[0.8rem] transition-all',
        active
          ? 'bg-accent -translate-y-1 text-white shadow-[4px_4px_0_var(--ink)]'
          : 'bg-card hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--ink)]',
      )}
    >
      {children}
    </button>
  );
}
