<<<<<<< HEAD
# 🎵 Yumi — AI-Powered Personalized Music Generation MVP

Yumi is a Korean-language AI music generation web application that transforms a user’s mood, genre preferences, and creative ideas into personalized music generation requests.

Built with:

- React
- Vite
- Tailwind CSS
- Node.js local backend
- ACEMusic hosted API integration
=======
# Yumi — AI Music Creator

Yumi is a portfolio MVP for creating short AI-generated music from mood, genre,
lyrics, and sound direction.

The project combines a Korean-first music creator UI with a local Node backend
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
- ACEMusic hosted API integration through a local backend
- Generated audio playback
- Generated lyrics display in the `가사` panel
- Optional subtitle overlay with approximate timing
- Generated SVG album cover using the final song title
- Download menu for audio, album cover, and lyrics text when available
- Demo-only mode for public portfolio deployment
- Secret scanning helper for API-key safety

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Local Node.js HTTP server |
| Music Provider | ACEMusic hosted API |
| Local Storage | Generated files in `generated/`; usage record in `server/data/` |
| Public Demo | Static demo assets in `public/demo/` |
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)

This project was designed as an MVP prototype for an intelligent music generation experience focused on emotional interaction, personalization, and safe API architecture.

---

# ✨ Project Overview

Yumi guides users through a simple emotional music creation flow:

```text
Mood Selection
→ Genre Preferences
→ Creative Input
→ AI Music Request
→ Generated Music Result
```

Unlike direct frontend API integrations, Yumi hides all provider communication behind a secure local backend layer.

---

# 🌱 Creative Philosophy

Yumi was not created to replace real artists, musicians, or human creativity.

The goal of this project is to explore how generative AI can become a creative support tool that helps users express emotions, discover new musical ideas, and expand their creative possibilities.

Rather than replacing human artists, Yumi aims to demonstrate how AI systems can:

- assist creative exploration
- support emotional expression
- inspire experimentation
- help users interact with music in new ways

This project is also part of a broader research interest in Human-AI Interaction and emotionally aware generative systems.

Yumi treats generative AI not as a substitute for human artistry, but as a collaborative medium that can extend and enrich the creative space around music.

# 🧠 Key Features

- 🎼 Emotion-based music generation flow
- 🇰🇷 Korean-language UI/UX
- 🔒 Secure backend API proxy architecture
- 🎧 Demo playback mode for public deployment
- 🧩 Structured prompt engineering pipeline
- ⚡ Fast React + Vite frontend
- 🎨 Tailwind-based responsive interface
- 📁 Local generated audio management
- 🛡️ Security validation scripts

---

# 🏗️ Architecture

```text
React Frontend (Yumi)
        ↓
Local Yumi Backend (127.0.0.1:4000)
        ↓
ACEMusic Hosted API
        ↓
Generated Audio Response
```

---

# ⚙️ Current Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js |
| Music Provider | ACEMusic Hosted API |
| Deployment Mode | Demo-safe public deployment |
| Language | Korean UI |

---

# 📂 Project Structure

```text
<<<<<<< HEAD
yumi/
├── public/
│   └── demo/
├── server/
├── src/
├── generated/
├── .env.example
├── package.json
└── README.md
```

---

# 🔐 Security Architecture

Yumi intentionally avoids exposing provider credentials to the browser.

## Principles

- API keys are stored only inside `.env.local`
- Frontend never directly calls external music APIs
- Public deployments disable real generation
- Demo audio is served statically
- Sensitive files are excluded from Git

---

# 🚫 Files Excluded From Git

```gitignore
node_modules/
dist/
.env
.env.local
generated/
*.wav
*.mp3
.venv/
```

---

# 🚀 Local Development

## Install Dependencies
=======
React/Vite UI
  -> local Yumi backend at http://127.0.0.1:4000
  -> ACEMusic hosted API
  -> generated audio + provider metadata
  -> local generated/ files
  -> UI result panel
```

The browser never calls the hosted provider directly. The API key is read only
by the local backend from `.env.local`.

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
  generated/              # local generated files, not for Git
  .env.example
  package.json
```

## Local Setup

Install dependencies:
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)

```bash
npm install
```

<<<<<<< HEAD
## Run Frontend
=======
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
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)

```bash
npm run dev
```

<<<<<<< HEAD
Frontend usually opens at:
=======
Open:
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)

```text
http://localhost:5173
```

<<<<<<< HEAD
---

# 🔧 Backend Configuration

Create local environment file:

```bash
cp .env.example .env.local
```

Example configuration:

```env
MUSIC_PROVIDER=acemusic-api
ACEMUSIC_API_BASE_URL=https://api.acemusic.ai
ACEMUSIC_API_KEY=replace_with_new_key

LOCAL_DAILY_LIMIT=0
LOCAL_BIND_HOST=127.0.0.1
LOCAL_API_PORT=4000

LOCAL_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

DEPLOY_DEMO_ONLY=false

VITE_MUSIC_API_BASE=http://127.0.0.1:4000
```

---

# ▶️ Run Local Backend

```bash
npm run server
npm run server:music
```

Health check:
=======
## Useful Commands

```bash
npm run typecheck
npm run build
npm run security:check
```

Runtime checks:
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)

```bash
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1:4000/api/usage
```

<<<<<<< HEAD
---

# ☁️ Hosted Provider Integration

Yumi currently uses only the hosted ACEMusic API flow.

The backend converts frontend emotional input into structured Korean music-generation prompts and sends requests to:

```text
POST /v1/chat/completions
```

Key characteristics:

- Browser never accesses provider directly
- API key remains server-side
- Audio responses stored locally
- Structured metadata returned to frontend

---

# 🎧 Public Demo Deployment

For safety reasons, public deployments use demo-only playback.

When either condition is true:
=======
## API Behavior

The frontend sends structured generation input to the local backend:

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

## Demo and Deployment Notes

For a public portfolio deployment, avoid exposing a private generation key.
Use demo-only mode unless the deployment platform provides secure server-side
environment variables.
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)

```env
DEPLOY_DEMO_ONLY=true
```

<<<<<<< HEAD
or

```env
NODE_ENV=production
```

the backend stops external generation and serves demo tracks only.

---

# 🧪 Validation & Security Checks

## Type Checking

```bash
npm run typecheck
```

## Production Build

```bash
npm run build
```

## Security Scan

```bash
npm run security:check
```

Security checks detect:

- Exposed API keys
- Hardcoded bearer tokens
- Committed credentials
- Dangerous environment leaks

---

## ACE-Step

- https://github.com/ace-step/ACE-Step-1.5
- https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md
- https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md

---

# 🎯 Future Goals

Planned future extensions include:

- Full AI music generation pipeline
- Album artwork generation
- Emotion-aware recommendation system
- User listening history adaptation
- Intelligent prompt refinement
- LLM-powered music understanding
- Entertainment-focused AI interaction research

---



# 📄 License

This project is intended for educational, research, and portfolio purposes.
=======
In demo-only mode, the backend does not call ACEMusic. It returns prepared demo
assets from `public/demo/`.

## Security Notes

- Do not commit `.env.local`.
- Do not place API keys in React code.
- Do not commit `generated/` or local usage files.
- Run `npm run security:check` before pushing to GitHub or Hugging Face.

## Documentation

- [Product Requirements Document](docs/PRD.md)
- [Design Document](docs/DESIGN.md)

## Status

Yumi is an MVP and portfolio research project. It focuses on the end-to-end
experience of creative music generation rather than production-scale account
management, billing, sharing, or editing workflows.
