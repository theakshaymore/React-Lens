# react-lens

![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-orange)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

`react-lens` is a React/TypeScript codebase health analyzer with:
- A CLI for repository scans
- A web app for interactive diagnostics
- AI-powered fix suggestions using Google Gemini

It scores code quality from `0-100` and reports diagnostics across:
- Accessibility
- Best Practices
- Bundle Quality

## Features

- Monorepo architecture with `pnpm` workspaces
- Strict TypeScript across all packages
- AST-driven static analysis for TS/JS/TSX/JSX files
- Category-aware scoring with severity-based penalties
- Interactive web UI with diagnostics and AI fix panel
- Shareable scan result URLs
- Gemini usage metadata returned by backend APIs

## Monorepo Structure

```text
react-lens/
├── packages/
│   ├── cli/                 # Scanner engine + CLI entrypoint
│   └── web/
│       ├── backend/         # Express API
│       └── frontend/        # React + Vite UI
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Tech Stack

- Monorepo: `pnpm` workspaces
- Language: TypeScript (strict mode)
- CLI: `commander`, `chalk`, `ora`, `@typescript-eslint/typescript-estree`
- Backend: Node.js + Express
- Frontend: React + Vite + Tailwind + Framer Motion
- AI: `@google/generative-ai`

## Requirements

- Node.js `>=20`
- pnpm `>=9`
- Optional for AI fixes: `GOOGLE_API_KEY`

## Environment Variables

Create environment files from `.env.example`:

```bash
cp .env.example .env
cp .env.example packages/web/backend/.env
```

Required values:

```env
GOOGLE_API_KEY=your_google_ai_studio_key
PORT=8787
```

Optional frontend footer links:

```env
VITE_GITHUB_URL=https://github.com/your-username
VITE_PORTFOLIO_URL=https://your-portfolio.example.com
```

## Installation

```bash
cd ~/projects/react-lens
pnpm install
pnpm build
```

## Running the Project

Start backend + frontend in dev mode:

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8787`

## CLI Usage

From repo root:

```bash
pnpm scan .
pnpm scan . --verbose
pnpm scan . --category a11y
pnpm scan . --fix
pnpm scan . --score
```

Published package usage:

```bash
npx react-lens .
```

## Scoring Model

- Start score: `100`
- `error` violation: `-3`
- `warn` violation: `-1`
- Minimum score: `0`

Category scores are computed independently and returned with global score.

## Rules

### Accessibility (`error`)
- `no-img-without-alt`
- `no-button-without-label`
- `no-anchor-without-href`
- `no-missing-aria-role`

### Best Practices (`warn`)
- `no-console-log`
- `no-direct-dom-manipulation`
- `no-props-drilling` (heuristic)
- `no-large-component`

### Bundle Quality (`warn`)
- `no-full-library-import`
- `no-unused-imports`
- `no-hardcoded-strings`

## Backend API

### `POST /api/scan`
Scan code or a GitHub repo.

Request:
```json
{
  "code": "optional string",
  "repoUrl": "optional github url",
  "share": true
}
```

Response:
```json
{
  "result": {
    "score": 84,
    "breakdown": {
      "accessibility": 97,
      "best-practices": 82,
      "bundle": 91
    },
    "diagnostics": []
  },
  "shareId": "optional"
}
```

### `GET /api/share/:id`
Fetches a shared scan result.

### `GET /api/fix` and `GET /api/fix/status`
Returns AI provider status.

### `POST /api/fix`
Generate AI fix suggestion.

Supported payloads:
- Diagnostic mode: `{ diagnostic, code, systemPrompt?, temperature?, maxTokens? }`
- Prompt mode: `{ prompt, systemPrompt?, temperature?, maxTokens? }`

Response shape:
```json
{
  "suggestion": {
    "explanation": "...",
    "fixedCode": "..."
  },
  "usage": {
    "promptTokens": 0,
    "completionTokens": 0,
    "totalTokens": 0
  },
  "model": "models/gemini-1.5-flash"
}
```

## Development Commands

```bash
pnpm build        # build all workspaces
pnpm typecheck    # type-check all workspaces
pnpm lint         # placeholder lint scripts
pnpm dev:cli      # run CLI package in dev mode
```

## Troubleshooting

### Gemini 404 / model errors
- Verify `GOOGLE_API_KEY` is valid in Google AI Studio.
- Ensure Generative Language API access is enabled for the key/project.
- Check backend logs for selected model and SDK version.

### AI response not valid JSON
- Backend includes strict prompting and JSON extraction fallback.
- If needed, tune `temperature` lower (e.g. `0.0-0.2`) in `/api/fix` request.

### No diagnostics found unexpectedly
- Confirm files are inside supported extensions: `.ts`, `.tsx`, `.js`, `.jsx`.
- Verify target path passed to CLI is correct.

## License

MIT
