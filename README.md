# 🎵 Yumi — AI-Powered Personalized Music Generation MVP

Yumi is a Korean-language AI music generation web application that transforms a user’s mood, genre preferences, and creative ideas into personalized music generation requests.

[🚀 Live Demo on Hugging Face](https://huggingface.co/spaces/ALEXJK0901/yumi-ai-music-generator)

Built with:

- React
- Vite
- Tailwind CSS
- Node.js local backend
- ACEMusic hosted API integration

---

# ✨ Project Overview

Yumi is a portfolio MVP for creating short AI-generated music experiences from:

- mood
- genre preferences
- lyrics or creative ideas
- sound direction

The project combines a Korean-first music creator interface with a secure local backend architecture that keeps external API credentials out of the browser.

Users can:

- write a song idea
- choose emotional and stylistic settings
- generate music
- preview generated lyrics
- listen to generated audio
- view subtitle-like lyric timing
- preview generated album-cover visuals
- download available assets

Unlike direct frontend API integrations, Yumi hides all provider communication behind a secure backend layer.

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

This project explores AI as a collaborative creative partner rather than a replacement for human musicians and artistic identity.

---

# 🧠 Current Features

- 🎼 Emotion-based music generation flow
- 🇰🇷 Korean-first music creation interface
- 🎤 Vocal tone and sound-detail configuration
- 🎧 Generated audio playback
- 📝 Generated lyrics display
- 🎬 Optional subtitle-style lyric timing
- 🖼️ Generated SVG album-cover preview
- ⬇️ Download menu for generated assets
- 🔒 Secure backend API proxy architecture
- 🎧 Demo-only mode for public deployment
- 🧩 Structured prompt engineering pipeline
- ⚡ Fast React + Vite frontend
- 🎨 Tailwind-based responsive UI
- 🛡️ Security validation scripts

---

# 🏗️ Architecture

```text
React/Vite Frontend
        ↓
Local Yumi Backend (127.0.0.1:4000)
        ↓
ACEMusic Hosted API
        ↓
Generated Audio + Metadata
        ↓
Result UI
```

The browser never calls the hosted provider directly.  
The API key is stored only inside `.env.local`.

---

# ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Local Node.js HTTP server |
| Music Provider | ACEMusic hosted API |
| Local Storage | `generated/`, `server/data/` |
| Public Demo | Static demo assets in `public/demo/` |

---

# 📂 Project Structure

```text
yumi/
├── docs/
│   ├── DESIGN.md
│   └── PRD.md
├── public/
│   └── demo/
├── server/
│   ├── local-music-server.mjs
│   └── check-secrets.mjs
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
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

```bash
npm install
```

---

## Create Environment File

```bash
cp .env.example .env.local
```

Example configuration:

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

---

## Run Backend

```bash
npm run server:music
```

---

## Run Frontend

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

---

# 🧪 Useful Commands

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

Runtime checks:

```bash
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1:4000/api/usage
```

---

# ☁️ Hosted Provider Integration

Yumi currently uses the hosted ACEMusic API flow.

The backend converts frontend emotional input into structured music-generation prompts and sends requests to:

```text
POST /v1/chat/completions
```

Key characteristics:

- Browser never accesses provider directly
- API key remains server-side
- Audio responses stored locally
- Structured metadata returned to frontend

---

# 🎧 Demo Deployment Mode

For public portfolio deployment, Yumi supports demo-only playback mode.

Enable:

```env
DEPLOY_DEMO_ONLY=true
```

In demo-only mode:

- no external API calls are made
- demo tracks from `public/demo/` are served
- private API keys remain protected

---

# 📚 Documentation

- [Product Requirements Document](docs/PRD.md)
- [Design Document](docs/DESIGN.md)

---

# 🎯 Future Goals

Planned future extensions include:

- emotion-aware recommendation systems
- album artwork generation
- user listening-history adaptation
- intelligent prompt refinement
- LLM-powered music understanding
- Human–AI creative interaction research
- scalable deployment workflows
- commercial AI music API integrations

---

# 📄 License

This project is intended for educational, research, and portfolio purposes.
