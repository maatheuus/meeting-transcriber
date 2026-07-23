-- Initial schema. Never edit an applied migration: add a new numbered file.

CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  folder_id INTEGER REFERENCES folders (id) ON DELETE SET NULL,
  audio_path TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  cover_image_path TEXT,
  summary_md TEXT,
  notes_md TEXT,
  language TEXT,
  -- App-level lifecycle of a meeting: idle | recording | transcribing | complete.
  status TEXT NOT NULL DEFAULT 'idle',
  -- Id of the summary template last chosen for this meeting.
  instruction_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Ids are citation targets for the summary, so they are never reassigned.
CREATE TABLE segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id TEXT NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  speaker TEXT NOT NULL DEFAULT '',
  start_ms INTEGER NOT NULL DEFAULT 0,
  end_ms INTEGER,
  text TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE meeting_tags (
  meeting_id TEXT NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, tag_id)
);

-- meeting_id NULL marks a label known across every recording.
CREATE TABLE known_speakers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id TEXT REFERENCES meetings (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  display_name TEXT
);

CREATE UNIQUE INDEX idx_known_speakers_label ON known_speakers (ifnull(meeting_id, ''), label);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- `instructions` holds the JSON body of a template: { context, format }.
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'file',
  instructions TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_segments_meeting_start ON segments (meeting_id, start_ms);
CREATE INDEX idx_meetings_folder ON meetings (folder_id);
CREATE INDEX idx_meetings_updated ON meetings (updated_at);

-- Full-text search. `segments_fts` shadows segments by rowid; `meetings_fts`
-- keeps its own copy of the title because meetings.id is TEXT, not a rowid.
CREATE VIRTUAL TABLE segments_fts USING fts5 (text, content = 'segments', content_rowid = 'id');

CREATE VIRTUAL TABLE meetings_fts USING fts5 (title, meeting_id UNINDEXED);

CREATE TRIGGER segments_ai AFTER INSERT ON segments BEGIN
  INSERT INTO segments_fts (rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER segments_ad AFTER DELETE ON segments BEGIN
  INSERT INTO segments_fts (segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;

CREATE TRIGGER segments_au AFTER UPDATE ON segments BEGIN
  INSERT INTO segments_fts (segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO segments_fts (rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER meetings_ai AFTER INSERT ON meetings BEGIN
  INSERT INTO meetings_fts (meeting_id, title) VALUES (new.id, new.title);
END;

CREATE TRIGGER meetings_ad AFTER DELETE ON meetings BEGIN
  DELETE FROM meetings_fts WHERE meeting_id = old.id;
END;

CREATE TRIGGER meetings_au AFTER UPDATE OF title ON meetings BEGIN
  DELETE FROM meetings_fts WHERE meeting_id = old.id;
  INSERT INTO meetings_fts (meeting_id, title) VALUES (new.id, new.title);
END;
