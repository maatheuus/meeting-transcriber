# meeting-transcriber

A desktop app to transcribe your meetings — Notion-like — with AI, and get a summary of the transcribed meeting.

> **Status:** early stage. The Electron + React + Tailwind + shadcn/ui foundation is in place; transcription and summarization are not implemented yet.

## Stack

- [Electron](https://www.electronjs.org/) 39 + [electron-vite](https://electron-vite.org/) 5
- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4 via `@tailwindcss/vite`
- [shadcn/ui](https://ui.shadcn.com/) (`new-york` style, `neutral` base color) + [lucide](https://lucide.dev/) icons
- ESLint + Prettier (`@electron-toolkit` configs)
- [electron-builder](https://www.electron.build/) for packaging

## Requirements

- Node.js 20+
- [Yarn](https://yarnpkg.com/) 4 (pinned via `packageManager` in `package.json`)

## Getting started

```bash
yarn install
yarn dev
```

## Scripts

| Script              | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `yarn dev`          | Run the app in development with HMR              |
| `yarn start`        | Preview the production build                     |
| `yarn build`        | Typecheck and build main, preload and renderer   |
| `yarn build:mac`    | Build and package for macOS                      |
| `yarn build:win`    | Build and package for Windows                    |
| `yarn build:linux`  | Build and package for Linux                      |
| `yarn build:unpack` | Build and package unpacked (for local debugging) |
| `yarn lint`         | Run ESLint                                       |
| `yarn format`       | Format the repo with Prettier                    |
| `yarn typecheck`    | Typecheck both the node and web tsconfigs        |

## Project structure

```
src/
├── main/        # Electron main process (window creation, IPC)
├── preload/     # Preload script exposing the bridge to the renderer
└── renderer/    # React app
    └── src/
        ├── components/ui/  # shadcn/ui components
        ├── lib/            # utilities (cn helper)
        └── assets/         # global styles / Tailwind entry
```

Path aliases: `@renderer/*` points to `src/renderer/src/*` (see `electron.vite.config.ts` and `tsconfig.web.json`).

## Adding shadcn/ui components

`components.json` is already configured, so components land in `src/renderer/src/components/ui`:

```bash
npx shadcn@latest add <component>
```

## Notes

- `README.electron-vite.md` keeps the original electron-vite template instructions (recommended IDE setup, etc.).
