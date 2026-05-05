# Yumi

Yumi is a guided AI music generation web app MVP. Users move through a simple flow that captures mood, genre preferences, and creative input before seeing a placeholder generated music result.

The product is designed for a future Suno API wrapper integration that will generate audio, album artwork, and video outputs. That integration is planned and in progress; this MVP intentionally uses mock data only.

## Overview

Yumi turns an early creative feeling into a structured music generation request. The current app focuses on the user experience and project architecture needed before real model/provider orchestration is added.

## Features

- Home page with project introduction and Start button
- Guided flow: Home -> Mood -> Preferences -> Creative Input -> Loading -> Result
- Mood selection with preset chips and custom mood input
- Genre preference selection with optional artist references
- Creative input fields for lyrics, song idea, vocal style, and sound description
- Emotional loading state while the mock request resolves
- Result screen with placeholder album cover, audio player, video area, and Generate Again button
- Mock `/api/generate` route returning placeholder generated track data

## Tech Stack

- Next.js
- React
- TypeScript
- CSS Modules-style global utility classes in `app/globals.css`

## Architecture

```text
yumi/
  app/
    api/generate/route.ts      Mock generation API route
    globals.css                Responsive MVP styling
    layout.tsx                 Root app layout and metadata
    page.tsx                   App entry point
  components/
    CreativeInputStep.tsx      Lyrics, idea, vocal, and sound inputs
    HomeScreen.tsx             Intro screen
    LoadingState.tsx           Emotional loading messages
    MoodStep.tsx               Mood selection step
    PreferenceStep.tsx         Genre and artist preference step
    ResultScreen.tsx           Mock generated result
    YumiFlow.tsx               Client-side guided flow controller
  types/
    music.ts                   MusicGenerationInput and GeneratedMusicResult
```
## 📄 Documentation

Detailed project documentation is available in the `/docs` folder:

- 📘 [Product Requirements Document (PRD)](./docs/PRD.md)  
  → Full problem definition, user needs, goals, and success metrics

- 🎨 [Design Document](./docs/DESIGN.md)  
  → UX flow, screen structure, user journey, and interaction design
  
## MVP Scope

This version only implements the initial UI and mock request lifecycle. It does not include authentication, database persistence, file storage, social sharing, billing, or real generation provider calls.

## Future Roadmap

- Integrate the Suno API wrapper in `/api/generate`
- Add robust request validation and provider error handling
- Return real generated audio, image, and video URLs
- Add generation status polling for longer-running jobs
- Add editable prompt summaries before generation
- Add download and export actions after generation
- Add project history after storage is introduced

## Suno Integration Note

The Suno API wrapper integration should be implemented server-side in `app/api/generate/route.ts`. Keep provider credentials and orchestration logic on the server, then return a `GeneratedMusicResult` to the client flow.

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
