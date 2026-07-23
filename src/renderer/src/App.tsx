import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { Sidebar } from '@renderer/components/layout/Sidebar';
import { HomeView } from '@renderer/components/layout/HomeView';
import { MeetingView } from '@renderer/components/meeting/MeetingView';
import { ThemeProvider } from '@renderer/components/theme-provider';
import type { Meeting } from '@renderer/types';

export type { Meeting } from '@renderer/types';

const MEETINGS_KEY = 'meetings';
const FOLDERS_KEY = 'folders';

const DEFAULT_FOLDERS = ['Work', 'Personal'];

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function App(): React.JSX.Element {
  const [meetings, setMeetings] = useState<Meeting[]>(() =>
    readStored<Meeting[]>(MEETINGS_KEY, []),
  );
  const [folders, setFolders] = useState<string[]>(() =>
    readStored<string[]>(FOLDERS_KEY, DEFAULT_FOLDERS),
  );
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  }, [folders]);

  const addMeeting = (folder?: string) => {
    const now = new Date();
    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: 'New Meeting',
      date:
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' // ' +
        now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      status: 'idle',
      folder,
      transcript: [],
      notes: '',
      summary: '',
      durationSeconds: 0,
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
  };

  const updateMeeting = (updated: Meeting) => {
    setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const deleteMeeting = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setSelectedMeetingId((current) => (current === id ? null : current));
  };

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="bg-bg text-ink border-ink selection:bg-accent relative flex h-screen w-full overflow-hidden border-[4px] font-sans selection:text-white">
        <Sidebar
          meetings={meetings}
          setMeetings={setMeetings}
          folders={folders}
          setFolders={setFolders}
          selectedMeetingId={selectedMeetingId}
          onSelectMeeting={setSelectedMeetingId}
          onGoHome={() => setSelectedMeetingId(null)}
          onAddMeeting={addMeeting}
          onDeleteMeeting={deleteMeeting}
        />
        {selectedMeeting ? (
          <MeetingView
            key={selectedMeeting.id}
            meeting={selectedMeeting}
            onUpdateMeeting={updateMeeting}
            onBack={() => setSelectedMeetingId(null)}
          />
        ) : (
          <HomeView
            meetings={meetings}
            onSelectMeeting={setSelectedMeetingId}
            onAddMeeting={() => addMeeting()}
          />
        )}
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </ThemeProvider>
  );
}

export default App;
