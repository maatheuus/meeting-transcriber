import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@renderer/components/theme-provider';
import {
  Moon,
  Sun,
  PanelLeftOpen,
  Pencil,
  Search,
  Settings,
  FolderOpen,
  Plus,
  Trash2,
  MoreHorizontal,
  Inbox,
  Folder,
  Home,
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { SettingsModal } from './SettingsModal';
import type { Meeting } from '@renderer/types';

type SidebarProps = {
  meetings: Meeting[];
  setMeetings: React.Dispatch<React.SetStateAction<Meeting[]>>;
  folders: string[];
  setFolders: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onGoHome: () => void;
  onAddMeeting: (folder?: string) => void;
  onDeleteMeeting: (id: string) => void;
};

export function Sidebar({
  meetings,
  setMeetings,
  folders,
  setFolders,
  selectedMeetingId,
  onSelectMeeting,
  onGoHome,
  onAddMeeting,
  onDeleteMeeting,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null means 'All'
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [contextMenuMeetingId, setContextMenuMeetingId] = useState<string | null>(null);

  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const x = useMotionValue(0);
  const baseWidth = useMotionValue(320);
  const width = useTransform(() => Math.max(0, baseWidth.get() + x.get()));
  const contentOpacity = useTransform(width, [0, 150, 240], [0, 0, 1]);

  useEffect(() => {
    if (isCreatingFolder) newFolderInputRef.current?.focus();
  }, [isCreatingFolder]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenuMeetingId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDragEnd = (_e: unknown, info: { velocity: { x: number } }) => {
    const currentWidth = baseWidth.get() + x.get();
    if (currentWidth < 150 || info.velocity.x < -500) {
      setIsOpen(false);
      animate(baseWidth, 0, { type: 'spring', bounce: 0, duration: 0.3 });
    } else {
      setIsOpen(true);
      animate(baseWidth, Math.min(Math.max(currentWidth, 240), 480), {
        type: 'spring',
        bounce: 0,
        duration: 0.3,
      });
    }
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 });
  };

  const handleOpen = () => {
    setIsOpen(true);
    animate(baseWidth, 320, { type: 'spring', bounce: 0, duration: 0.3 });
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 });
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, title: editTitle.trim() } : m)));
    }
    setEditingId(null);
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (name && name !== 'Uncategorized' && !folders.includes(name)) {
      setFolders((prev) => [...prev, name]);
      setSelectedFolder(name);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  /** Renaming a folder also moves every meeting that pointed at the old name. */
  const handleRenameFolder = (oldName: string) => {
    const name = editFolderName.trim();
    setEditingFolder(null);

    if (!name || name === oldName || name === 'Uncategorized' || folders.includes(name)) return;

    setFolders((prev) => prev.map((f) => (f === oldName ? name : f)));
    setMeetings((prev) => prev.map((m) => (m.folder === oldName ? { ...m, folder: name } : m)));
    setSelectedFolder((current) => (current === oldName ? name : current));
  };

  const handleDeleteFolder = (e: React.MouseEvent, folder: string) => {
    e.stopPropagation();
    setFolders((prev) => prev.filter((f) => f !== folder));
    if (selectedFolder === folder) setSelectedFolder(null);
    setMeetings((prev) => prev.map((m) => (m.folder === folder ? { ...m, folder: undefined } : m)));
  };

  const handleDrop = (e: React.DragEvent, targetFolder: string | null) => {
    e.preventDefault();
    const meetingId = e.dataTransfer.getData('text/plain');
    if (!meetingId) return;
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, folder: targetFolder || undefined } : m)),
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleMoveToFolder = (e: React.MouseEvent, meetingId: string, folder: string | null) => {
    e.stopPropagation();
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, folder: folder || undefined } : m)),
    );
    setContextMenuMeetingId(null);
  };

  const namedFolders = folders.filter((f) => f !== 'Uncategorized');

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFolder === 'Uncategorized') return matchesSearch && !m.folder;
    return matchesSearch && (selectedFolder === null || m.folder === selectedFolder);
  });

  const getTagColor = (tag: string) => {
    if (tag.toLowerCase() === 'urgent') return 'bg-[#FF7043] text-white border-transparent';
    if (tag.toLowerCase() === 'work') return 'bg-accent/20 text-accent border-accent/30';
    if (tag.toLowerCase() === 'personal')
      return 'bg-[#9575CD]/20 text-[#9575CD] border-[#9575CD]/30';
    return 'bg-ink/10 text-ink border-ink/20';
  };

  return (
    <>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="bg-card border-ink group absolute top-8 left-8 z-50 flex cursor-pointer items-center justify-center border-[3px] p-3 shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
        >
          <PanelLeftOpen size={24} className="text-ink group-hover:text-accent transition-colors" />
        </button>
      )}

      <motion.aside
        style={{ width, borderRightWidth: isOpen ? 4 : 0 }}
        className="bg-accent-soft border-ink relative z-40 flex h-full flex-shrink-0 flex-col overflow-hidden"
      >
        <motion.div
          style={{ opacity: contentOpacity, pointerEvents: isOpen ? 'auto' : 'none' }}
          className="flex h-full w-full min-w-[240px] flex-col overflow-hidden p-8"
        >
          <button
            onClick={onGoHome}
            className="font-display text-accent mt-4 mb-8 -rotate-2 px-2 text-left text-[2.5rem] leading-none whitespace-nowrap transition-opacity hover:opacity-80"
            title="Back to home"
          >
            Transcriber*
          </button>

          <nav className="mb-6 shrink-0 px-2">
            <span className="text-ink mb-4 block font-mono text-[0.7rem] tracking-[0.1em] uppercase opacity-60">
              Menu
            </span>
            <div className="group relative mb-3">
              <input
                type="text"
                placeholder="Search Archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-ink group-hover:border-ink/20 focus:border-accent placeholder:text-ink/60 block w-full border-b-2 border-transparent bg-transparent pb-1 text-[0.9rem] font-bold whitespace-nowrap transition-colors outline-none"
              />
              <Search size={14} className="text-ink/60 absolute top-1 right-0" />
            </div>
            <button
              onClick={onGoHome}
              className="group mb-3 flex w-full cursor-pointer items-center justify-between"
            >
              <span className="text-ink group-hover:text-accent text-[0.9rem] font-bold transition-colors">
                Home
              </span>
              <Home size={16} className="text-ink group-hover:text-accent shrink-0" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="group mb-3 flex w-full cursor-pointer items-center justify-between"
            >
              <span className="text-ink group-hover:text-accent text-[0.9rem] font-bold transition-colors">
                User Settings
              </span>
              <Settings size={16} className="text-ink group-hover:text-accent shrink-0" />
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="group mb-3 flex w-full cursor-pointer items-center justify-between"
            >
              <span className="text-ink group-hover:text-accent text-[0.9rem] font-bold transition-colors">
                Theme: {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
              {theme === 'dark' ? (
                <Moon size={16} className="text-ink group-hover:text-accent shrink-0" />
              ) : (
                <Sun size={16} className="text-ink group-hover:text-accent shrink-0" />
              )}
            </button>
          </nav>

          <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-ink font-mono text-[0.7rem] tracking-[0.1em] whitespace-nowrap uppercase opacity-60">
                  Folders
                </span>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="hover:text-accent opacity-60 transition-colors hover:opacity-100"
                  title="New folder"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-1">
                <div
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors ${selectedFolder === null ? 'bg-ink/10 font-bold' : 'hover:bg-ink/5'}`}
                  onClick={() => setSelectedFolder(null)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, null)}
                >
                  <Inbox
                    size={14}
                    className={selectedFolder === null ? 'text-accent' : 'opacity-70'}
                  />
                  <span className="flex-1 text-[0.85rem]">All Meetings</span>
                  <span className="font-mono text-[0.7rem] opacity-50">{meetings.length}</span>
                </div>

                <div
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors ${selectedFolder === 'Uncategorized' ? 'bg-ink/10 font-bold' : 'hover:bg-ink/5'}`}
                  onClick={() => setSelectedFolder('Uncategorized')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, null)}
                >
                  <Folder
                    size={14}
                    className={selectedFolder === 'Uncategorized' ? 'text-accent' : 'opacity-70'}
                  />
                  <span className="flex-1 text-[0.85rem]">Uncategorized</span>
                  <span className="font-mono text-[0.7rem] opacity-50">
                    {meetings.filter((m) => !m.folder).length}
                  </span>
                </div>

                {namedFolders.map((folder) => {
                  const count = meetings.filter((m) => m.folder === folder).length;
                  const isSelected = selectedFolder === folder;

                  if (editingFolder === folder) {
                    return (
                      <div key={folder} className="bg-ink/5 flex items-center gap-2 px-2 py-1.5">
                        <FolderOpen size={14} className="opacity-70" />
                        <input
                          autoFocus
                          value={editFolderName}
                          onChange={(e) => setEditFolderName(e.target.value)}
                          onBlur={() => handleRenameFolder(folder)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingFolder(null);
                          }}
                          className="border-accent text-accent min-w-0 flex-1 border-b-2 bg-transparent text-[0.85rem] outline-none"
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={folder}
                      className={`group flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors ${isSelected ? 'bg-ink/10 font-bold' : 'hover:bg-ink/5'}`}
                      onClick={() => setSelectedFolder(folder)}
                      onDoubleClick={() => {
                        setEditFolderName(folder);
                        setEditingFolder(folder);
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, folder)}
                    >
                      <FolderOpen size={14} className={isSelected ? 'text-accent' : 'opacity-70'} />
                      <span className="flex-1 truncate text-[0.85rem]">{folder}</span>
                      <span className="font-mono text-[0.7rem] opacity-50 group-hover:hidden">
                        {count}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditFolderName(folder);
                          setEditingFolder(folder);
                        }}
                        className="hover:text-accent hidden p-1 opacity-60 transition-colors group-hover:block hover:opacity-100"
                        title="Rename folder"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolder(e, folder)}
                        className="hidden p-1 opacity-60 transition-colors group-hover:block hover:text-[#E53935] hover:opacity-100"
                        title="Delete folder"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}

                {isCreatingFolder && (
                  <div className="bg-ink/5 flex items-center gap-2 px-2 py-1.5">
                    <Folder size={14} className="opacity-50" />
                    <input
                      ref={newFolderInputRef}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onBlur={handleCreateFolder}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') {
                          setIsCreatingFolder(false);
                          setNewFolderName('');
                        }
                      }}
                      className="min-w-0 flex-1 border-none bg-transparent text-[0.85rem] outline-none"
                      placeholder="Folder name..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <span className="text-ink mb-3 block font-mono text-[0.7rem] tracking-[0.1em] whitespace-nowrap uppercase opacity-60">
                {selectedFolder === null ? 'All Meetings' : selectedFolder}
              </span>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1 pb-4">
                {filteredMeetings.map((m) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', m.id)}
                    className={`group hover:bg-ink/5 relative flex cursor-pointer flex-col border-2 p-2 transition-colors ${selectedMeetingId === m.id ? 'border-ink/30 bg-ink/5' : 'hover:border-ink/10 border-transparent'}`}
                  >
                    {m.coverImage && (
                      <div
                        className="border-ink/20 mb-2 h-16 w-full overflow-hidden border opacity-80 transition-opacity group-hover:opacity-100"
                        onClick={() => onSelectMeeting(m.id)}
                      >
                        <img src={m.coverImage} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        {editingId === m.id ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => saveEdit(m.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(m.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="text-ink bg-card border-ink block w-full truncate border-2 px-1 text-[0.9rem] font-bold outline-none"
                          />
                        ) : (
                          <div
                            className="flex items-center gap-2"
                            onClick={() => onSelectMeeting(m.id)}
                          >
                            {m.status === 'recording' && (
                              <span
                                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#FF7043]"
                                title="Recording"
                              />
                            )}
                            {m.status === 'transcribing' && (
                              <span
                                className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#FFD54F]"
                                title="Transcribing"
                              />
                            )}
                            {m.status === 'complete' && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4DB6AC]"
                                title="Complete"
                              />
                            )}
                            <span
                              className={`block truncate text-[0.85rem] font-bold transition-colors ${selectedMeetingId === m.id ? 'text-accent' : 'text-ink group-hover:text-accent'}`}
                            >
                              {m.title}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {editingId !== m.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(m.id);
                              setEditTitle(m.title);
                            }}
                            className="hover:bg-ink/10 p-1 opacity-0 transition-colors group-hover:opacity-100"
                            title="Rename"
                          >
                            <Pencil size={12} className="text-ink" />
                          </button>
                        )}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setContextMenuMeetingId(contextMenuMeetingId === m.id ? null : m.id);
                            }}
                            className="hover:bg-ink/10 p-1 opacity-0 transition-colors group-hover:opacity-100"
                            title="More options"
                          >
                            <MoreHorizontal size={14} className="text-ink" />
                          </button>

                          {contextMenuMeetingId === m.id && (
                            <div className="bg-bg border-ink absolute top-full right-0 z-50 mt-1 w-48 border-2 py-1 shadow-[4px_4px_0_var(--ink)]">
                              <div className="px-3 py-1 font-mono text-[0.65rem] uppercase opacity-50">
                                Move to folder
                              </div>
                              <button
                                onClick={(e) => handleMoveToFolder(e, m.id, null)}
                                className="hover:bg-ink/10 flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.85rem]"
                              >
                                <Inbox size={12} className="opacity-60" /> None
                              </button>
                              {namedFolders.map((f) => (
                                <button
                                  key={f}
                                  onClick={(e) => handleMoveToFolder(e, m.id, f)}
                                  className="hover:bg-ink/10 flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.85rem]"
                                >
                                  <Folder size={12} className="opacity-60" /> {f}
                                </button>
                              ))}
                              <div className="bg-ink/20 my-1 h-px" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenuMeetingId(null);
                                  onDeleteMeeting(m.id);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.85rem] hover:bg-[#E53935] hover:text-white"
                              >
                                <Trash2 size={12} /> Delete meeting
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {m.date && (
                        <span className="text-ink-muted block truncate font-mono text-[0.65rem]">
                          {m.date}
                        </span>
                      )}
                      {m.tags && m.tags.length > 0 && (
                        <div className="mt-1 flex shrink-0 items-center gap-1">
                          {m.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`border px-1.5 py-0.5 text-[0.6rem] font-bold ${getTagColor(tag)} max-w-[60px] truncate`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredMeetings.length === 0 && (
                  <div className="border-ink/20 mt-4 flex h-32 flex-col items-center justify-center border-2 border-dashed px-4 text-center opacity-60">
                    <FolderOpen size={24} className="mb-2 opacity-50" />
                    <span className="text-ink text-sm font-bold">
                      {searchQuery ? 'No matches' : 'This folder is empty'}
                    </span>
                    <span className="text-ink/70 mt-1 font-mono text-xs">Drag meetings here</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              onAddMeeting(
                selectedFolder && selectedFolder !== 'Uncategorized' ? selectedFolder : undefined,
              )
            }
            className="bg-accent font-display border-ink mt-4 shrink-0 border-[3px] p-4 text-center text-2xl whitespace-nowrap text-white shadow-[4px_4px_0_var(--ink)] transition-all hover:translate-y-[2px] hover:shadow-[2px_2px_0_var(--ink)] active:translate-y-[4px] active:shadow-none"
          >
            Start New +
          </button>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          style={{ x }}
          onDragEnd={handleDragEnd}
          className="hover:bg-ink/10 group absolute top-0 right-0 z-50 flex h-full w-3 cursor-col-resize items-center justify-center transition-colors"
        >
          <div className="bg-ink/20 group-hover:bg-ink/50 h-12 w-1 rounded-full transition-colors" />
        </motion.div>
      </motion.aside>
    </>
  );
}
