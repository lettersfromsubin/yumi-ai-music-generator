---
License: mit
sdk: docker
title: Yumi AI Music Creator
emoji: 🎧
colorFrom: indigo
colorTo: green
short_description: Korean-first AI music creator with ACEMusic backend
---
# Yumi — AI Music Creator

Yumi is a portfolio MVP for creating short AI-generated music from mood, genre,
lyrics, and sound direction.

The project combines a Korean-first music creator UI with a Node backend
that keeps the hosted music API key out of the browser. Users can write a song
idea, choose creative constraints, generate a track, view generated lyrics,
play approximate subtitles, download the available assets, and preview an
album-cover style visual.

## 🌱 Creative Philosophy

Yumi was not created to replace real artists, musicians, or human creativity.

The goal of this project is to explore how generative AI can become a creative
support tool that helps users express emotions, discover new musical ideas, and
expand their creative possibilities.

Rather than replacing human artists, Yumi aims to demonstrate how AI systems can:

- assist creative exploration
- support emotional expression
- inspire experimentation
- help users interact with music in new ways

This project is also part of a broader research interest in Human-AI Interaction
and emotionally aware generative systems.

Yumi treats generative AI not as a substitute for human artistry, but as a
collaborative medium that can extend and enrich the creative space around music.

## Current Features

- Korean-first music creation interface
- Prompt-style song idea input inspired by modern AI music tools
- Mood, genre, vocal tone, duration, sound-detail, and reference-artist controls
- Auto title mode with provider-title support and local fallback
- Custom title mode
- ACEMusic hosted API integration through a server-side backend
- Generated audio playback
- Generated lyrics display in the `가사` panel
- Optional subtitle overlay with approximate timing
- Generated SVG album cover using the final song title
- Download menu for audio, album cover, and lyrics text when available
- Docker-ready Hugging Face Space deployment
- Secret scanning helper for API-key safety

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Node.js HTTP server |
| Music Provider | ACEMusic hosted API |
| Local Storage | Generated files in `generated/`; usage record in `server/data/` |
| Deployment | Local dev or Hugging Face Docker Space |

## Architecture

Local development:

```text
React/Vite UI at localhost:5173
  -> Yumi backend at 127.0.0.1:4000
  -> ACEMusic hosted API
  -> generated audio + provider metadata
  -> local generated/ files
  -> UI result panel
```

Hugging Face Docker Space:

```text
Browser on *.hf.space
  -> same-origin /api/generate
  -> Node backend inside the Space
  -> ACEMusic hosted API using HF Secret ACEMUSIC_API_KEY
  -> generated files served from /generated/*
```

The browser never calls the hosted provider directly. The API key is read only
by the backend from `.env.local` locally or from Hugging Face Space Secrets in
deployment.

## Project Structure

```text
yumi/
  docs/
    DESIGN.md
    PRD.md
  public/
    demo/
  server/
    local-music-server.mjs
    check-secrets.mjs
  src/
    App.tsx
    main.tsx
    index.css
  generated/              # local generated files, not for Git or Docker
  Dockerfile              # Hugging Face Docker Space runtime
  .dockerignore
  .env.example
  package.json
```

## Local Setup

Install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

Configure `.env.local`:

```env
MUSIC_PROVIDER=acemusic-api
ACEMUSIC_API_BASE_URL=https://api.acemusic.ai
ACEMUSIC_API_KEY=replace_with_your_key
LOCAL_DAILY_LIMIT=0
LOCAL_BIND_HOST=127.0.0.1
LOCAL_API_PORT=4000
LOCAL_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DEPLOY_DEMO_ONLY=false
VITE_MUSIC_API_BASE=http://127.0.0.1:4000
```

Run the backend:

```bash
npm run server:music
```

Run the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Useful Commands

```bash
npm run typecheck
npm run build
npm run security:check
node --check server/local-music-server.mjs
```

Runtime checks:

```bash
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1:4000/api/usage
```

## Hugging Face Space Deployment

For full generation on Hugging Face, create a **Docker Space**. A static Space
is not enough because the API key must stay server-side.

Recommended setup:

1. Create a new Space on Hugging Face.
2. Choose **Docker** as the Space SDK.
3. Upload or sync this repository to the Space.
4. In the Space settings, add a Secret:

```text
ACEMUSIC_API_KEY=<your ACEMusic key>
```

Optional Space variables:

```text
MUSIC_PROVIDER=acemusic-api
ACEMUSIC_API_BASE_URL=https://api.acemusic.ai
DEPLOY_DEMO_ONLY=false
LOCAL_DAILY_LIMIT=0
```

Do not add `ACEMUSIC_API_KEY` as a public variable. Use **Secrets** only.

The Docker runtime builds the Vite frontend, starts the Node server on
`0.0.0.0:$PORT`, serves the frontend from `dist/`, and exposes the generation
API at the same origin:

```text
/api/generate
/api/health
/api/usage
/generated/*
```

## API Behavior

The frontend sends structured generation input to the backend:

- mood
- genres
- reference artists
- lyrics or creative idea
- vocal tone
- sound details
- duration
- title mode

The backend builds a provider prompt that asks for:

- an original song
- Korean lyrics in Hangul when Korean is used
- English lines to remain in English
- no romanized Korean where possible
- a short creative title
- lyrics content separate from provider metadata

If the provider returns a usable title, Yumi uses it. If not, Yumi falls back to
a local deterministic title picker. If the user selects custom title mode, the
custom title always wins.

## Demo Mode

Set this when you want to show the UI without calling the hosted music API:

```env
DEPLOY_DEMO_ONLY=true
```

In demo-only mode, the backend does not call ACEMusic. It returns prepared demo
assets from `public/demo/`.

## Security Notes

- Do not commit `.env.local`.
- Do not place API keys in React code.
- Do not commit `generated/` or local usage files.
- Store production API keys in Hugging Face Space Secrets.
- Run `npm run security:check` before pushing to GitHub or Hugging Face.

## Documentation

- [Product Requirements Document](docs/PRD.md)
- [Design Document](docs/DESIGN.md)

## Status

Yumi is an MVP and portfolio research project. It focuses on the end-to-end
experience of creative music generation rather than production-scale account
management, billing, sharing, or editing workflows.
