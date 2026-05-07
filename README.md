# 🎵 Yumi — AI-Powered Personalized Music Generation MVP

Yumi is a Korean-language AI music generation web application that transforms a user’s mood, genre preferences, and creative ideas into personalized music generation requests.

Built with:

- React
- Vite
- Tailwind CSS
- Node.js local backend
- ACEMusic hosted API integration

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

```bash
npm install
```

## Run Frontend

```bash
npm run dev
```

Frontend usually opens at:

```text
http://localhost:5173
```

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

```bash
curl http://127.0.0.1:4000/api/health
curl http://127.0.0.1:4000/api/usage
```

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

```env
DEPLOY_DEMO_ONLY=true
```

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
