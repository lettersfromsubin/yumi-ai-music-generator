<<<<<<< HEAD

=======
# Product Requirements Document — Yumi

## 1. Product Summary

Yumi is an AI music creation MVP that helps users turn emotions, creative ideas,
lyrics, and sound preferences into generated music.

The current product is a local-first web app:

- React/Vite frontend
- local Node.js backend
- ACEMusic hosted API provider
- demo-only mode for public deployment

Yumi is designed as a portfolio and Human-AI Interaction research project. The
product goal is not to replace musicians, but to explore how generative systems
can support creative expression.

## 2. 🌱 Creative Philosophy

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

## 3. Goals

### Product Goals

- Let users describe a song through mood, genre, lyrics, vocal tone, and sound.
- Generate a playable music result through a hosted AI music provider.
- Display generated lyrics without pretending user input is provider output.
- Provide optional approximate subtitles for the generated track.
- Generate or display an album-cover visual based on the final song title.
- Support download of available assets: audio, cover, and lyrics.
- Keep provider API keys server-side.
- Provide a safe public demo mode for portfolio hosting.

### Portfolio Goals

- Demonstrate frontend product design.
- Demonstrate secure API integration through a backend proxy.
- Demonstrate prompt design for mixed-language creative output.
- Demonstrate thoughtful positioning of generative AI as a creative support tool.

## 4. Non-Goals

Yumi is not trying to provide:

- artist replacement
- production music editing
- commercial publishing workflows
- account management
- payments
- community sharing
- database-backed library management
- guaranteed word-level subtitle alignment

## 5. Target Users

### Primary Users

- Students exploring creative AI tools
- Music fans who want to experiment with creating their own song ideas
- Portfolio reviewers evaluating product design, API integration, and AI UX

### User Needs

- Express a mood or situation musically
- Experiment with genre and vocal style
- Try bilingual Korean/English lyric ideas
- Hear and inspect a generated track quickly
- Download generated output for local review
- Understand that AI is used as a creative medium, not an artist replacement

## 6. User Experience

### Main Flow

1. User enters or edits a song idea.
2. User chooses mood, genre, artists, vocal tone, sound details, and duration.
3. User chooses automatic title or custom title.
4. User clicks `Create`.
5. Frontend sends structured input to the local backend.
6. Backend calls ACEMusic hosted API.
7. Backend saves returned audio locally.
8. Backend builds an album-cover SVG using the final title.
9. UI displays the result with audio playback, lyrics, subtitles, metadata, and downloads.

### Important UX Rules

- The `가사` panel must show generated/provider lyrics only.
- User textarea input must not be shown as generated lyrics.
- If provider lyrics are unavailable, the lyrics panel can remain empty.
- Korean lyrics should be requested in Hangul.
- English lines should remain in English.
- Subtitles are optional and can be toggled.
- Subtitle timing is approximate unless provider timestamps are available.
- The visual design should remain focused on the creator interface, not a landing page.

## 7. Functional Requirements

| ID | Requirement | Status |
| --- | --- | --- |
| FR-1 | User can write a song idea or lyrics | Implemented |
| FR-2 | User can select mood | Implemented |
| FR-3 | User can select multiple genres | Implemented |
| FR-4 | User can enter and quick-add reference artists | Implemented |
| FR-5 | User can configure vocal tone, sound details, and duration | Implemented |
| FR-6 | User can choose automatic or custom title | Implemented |
| FR-7 | Backend can call ACEMusic hosted API | Implemented |
| FR-8 | Backend keeps API key out of browser code | Implemented |
| FR-9 | UI displays audio player when audio is available | Implemented |
| FR-10 | UI displays generated lyrics when provider returns lyrics | Implemented |
| FR-11 | UI supports optional approximate subtitles | Implemented |
| FR-12 | UI displays generated album cover | Implemented |
| FR-13 | User can download audio, cover, and lyrics when available | Implemented |
| FR-14 | Public demo mode avoids external provider calls | Implemented |
| FR-15 | Secret scan command checks for committed API keys | Implemented |

## 8. Data Model

```ts
type MusicGenerationInput = {
  mood: string;
  genres: string[];
  artists: string[];
  styleDescription: string;
  lyricsOrIdea: string;
  vocalTone: string;
  soundDetails: string;
  duration: string;
  titleMode: "auto" | "custom";
  customTitle: string;
};

type GeneratedMusicResult = {
  title: string;
  audioUrl?: string;
  imageUrl?: string;
  prompt: string;
  lyricsText?: string;
  source: "local" | "demo";
  provider?: string;
  providerLabel?: string;
  metadata?: Record<string, unknown>;
  notice?: string;
  usage?: {
    date: string;
    count: number;
    limit: number | null;
    provider?: string;
    purpose?: string;
  };
};
```

## 9. API Requirements

### Local Backend

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Provider and server health |
| `/api/usage` | GET | Local usage record |
| `/api/generate` | POST | Generate a track |
| `/generated/:file` | GET | Serve generated audio/cover files |

### Provider Prompt Requirements

The backend prompt should request:

- original music
- a short creative title
- no generic title such as `차분한 K-pop` or `ACEMusic Track`
- Korean lines in Hangul
- English lines in English
- no romanized Korean where possible
- actual lyrics separated from metadata

### Title Priority

1. Custom user title, if `titleMode === "custom"`
2. Provider title, if returned and usable
3. Local deterministic fallback title

## 10. Security Requirements

- API keys must live only in `.env.local` or server-side deployment secrets.
- React code must not include provider keys.
- `.env.local`, `generated/`, and local usage data must not be committed.
- Public portfolio deployment should use demo-only mode unless backend secrets are configured safely.
- `npm run security:check` should be run before publishing.

## 11. Constraints

- The hosted provider may not return lyrics, title, or timestamps consistently.
- Subtitle timing is approximate without timestamp metadata.
- Public demo mode cannot create new tracks.
- Generated files are local filesystem assets, not persistent cloud storage.
- No auth or database exists in the MVP.

## 12. Success Criteria

### Product-Level

- User can generate or preview a complete music result.
- User can inspect lyrics and listen to the track.
- User can download available assets.
- UI clearly supports creative exploration.

### Engineering-Level

- TypeScript passes.
- Production build succeeds.
- Secret scan passes.
- Backend health endpoint responds.
- API keys remain server-side.

## 13. Future Improvements

- Real timestamp alignment for subtitles
- Better provider title extraction when metadata support improves
- Persistent generation history
- User accounts and saved projects
- Shareable public song pages
- Optional image-generation provider for richer album art
- Hugging Face Space demo packaging

## Final One-Line Definition

Yumi is a Korean-first AI music creator that uses generative AI as a collaborative
medium for emotional expression, musical experimentation, and Human-AI creative
interaction.
>>>>>>> 7958e6f (Prepare Yumi portfolio MVP)
