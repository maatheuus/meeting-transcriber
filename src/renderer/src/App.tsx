import { useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { Sidebar } from '@renderer/components/layout/Sidebar';
import { HomeView } from '@renderer/components/layout/HomeView';
import { MeetingView } from '@renderer/components/meeting/MeetingView';
import { ThemeProvider } from '@renderer/components/theme-provider';
import type { Meeting, MeetingPatch } from '@renderer/types';

export type { Meeting } from '@renderer/types';

function App(): React.JSX.Element {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const reloadMeetings = useCallback(async () => setMeetings(await window.api.meetings.list()), []);
  const reloadFolders = useCallback(async () => setFolders(await window.api.folders.list()), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([window.api.meetings.list(), window.api.folders.list()])
      .then(([loadedMeetings, loadedFolders]) => {
        if (cancelled) return;
        setMeetings(loadedMeetings);
        setFolders(loadedFolders);
      })
      .catch((e) => {
        console.error('Failed to load your archive', e);
        toast.error('Could not load your meetings');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addMeeting = async (folder?: string) => {
    try {
      const created = await window.api.meetings.create({ title: 'New Meeting', folder });
      setMeetings((prev) => [created, ...prev]);
      setSelectedMeetingId(created.id);
    } catch (e) {
      console.error('Failed to create meeting', e);
      toast.error('Could not create the meeting');
    }
  };

  // Edits are applied to local state immediately and written through to SQLite;
  // the response is not merged back so fast typing never gets rolled back.
  const patchMeeting = useCallback((id: string, patch: MeetingPatch) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    window.api.meetings.update(id, patch).catch((e) => {
      console.error('Failed to save meeting', e);
      toast.error('Could not save your changes');
    });
  }, []);

  // Segments live in their own table; the count is derived, not stored, so it is
  // refreshed in place when the open meeting gains or loses lines.
  const setSegmentCount = useCallback((id: string, segmentCount: number) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, segmentCount } : m)));
  }, []);

  const setMeetingCover = useCallback(async (id: string, dataUrl: string) => {
    const saved = await window.api.meetings.setCover(id, dataUrl);
    if (saved) setMeetings((prev) => prev.map((m) => (m.id === id ? saved : m)));
  }, []);

  const deleteMeeting = async (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setSelectedMeetingId((current) => (current === id ? null : current));
    // Removes the row, its segments, and its audio and cover files on disk.
    await window.api.meetings.delete(id).catch((e) => console.error('Failed to delete meeting', e));
  };

  const createFolder = async (name: string) => {
    await window.api.folders.create(name);
    await reloadFolders();
  };

  // Meetings reference folders by id, so a rename or delete changes what they
  // report without touching the meetings themselves — reload both lists.
  const renameFolder = async (oldName: string, newName: string) => {
    await window.api.folders.rename(oldName, newName);
    await Promise.all([reloadFolders(), reloadMeetings()]);
  };

  const deleteFolder = async (name: string) => {
    await window.api.folders.delete(name);
    await Promise.all([reloadFolders(), reloadMeetings()]);
  };

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  return (
    <ThemeProvider defaultTheme="light">
      <div className="bg-bg text-ink border-ink selection:bg-accent relative flex h-screen w-full overflow-hidden border-[4px] font-sans selection:text-white">
        <Sidebar
          meetings={meetings}
          folders={folders}
          selectedMeetingId={selectedMeetingId}
          onSelectMeeting={setSelectedMeetingId}
          onGoHome={() => setSelectedMeetingId(null)}
          onAddMeeting={addMeeting}
          onDeleteMeeting={deleteMeeting}
          onPatchMeeting={patchMeeting}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
        />
        {selectedMeeting ? (
          <MeetingView
            key={selectedMeeting.id}
            meeting={selectedMeeting}
            onPatchMeeting={patchMeeting}
            onSetCover={setMeetingCover}
            onSegmentCountChange={setSegmentCount}
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
