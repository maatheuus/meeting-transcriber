# AI Context - Meeting Transcriber

## Tech Stack

- **Desktop Framework**: Electron (v39+ using native CoreAudio Tap API for system audio capture on macOS)
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4, Lucide React (icons), Sonner (toast), Framer Motion, shadcn/ui components
- **Typography**: Satoshi (body), Clash Display (headings), JetBrains Mono (code)
- **Database**: SQLite (better-sqlite3) - Offline First
- **Transcription**: AssemblyAI (planned for cloud streaming & diarization)
- **LLM Summary**: Claude API (planned)

## Architecture & Design Patterns

- **Audio Capture**: Handled via `desktopCapturer` in Main process and requested securely via `preload` script.
- **Offline First**: All transcribed data and summaries must be stored locally in SQLite before any sync.
- **Diarization & References**: The transcription creates segments with stable IDs. The LLM summary references these segment IDs to allow clicking a summary point and scrolling to the exact transcript timestamp.

## Styling Rules

- **Color Palette**: OKLCH base variables in `.dark` theme.
- **Dark Mode Default**: The app runs in dark mode explicitly.
- **Component Design**: UI must resemble Notion (clean, distraction-free, tabs for Summary / Notes / Transcript).
