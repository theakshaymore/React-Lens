# react-lens

![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![pnpm](https://img.shields.io/badge/pnpm-workspaces-orange)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

`react-lens` analyzes React/TypeScript codebases and outputs a `0-100` health score across:
- Accessibility
- Best Practices
- Bundle Quality

It includes:
- A CLI (`react-lens`) for repository scans
- A web app (React + Vite frontend, Express backend)
- AI-powered fix suggestions via Google Gemini (`gemini-1.5-flash`)

## Requirements

- Node.js `>=20`
- pnpm `>=9`
- Optional: `GOOGLE_API_KEY` for AI fixes

## Setup

```bash
cd ~/projects/react-lens
pnpm install
pnpm build
```

## Run

```bash
pnpm dev
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
