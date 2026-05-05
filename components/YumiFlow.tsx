"use client";

import { useState } from "react";
import type { GeneratedMusicResult, MusicGenerationInput } from "@/types/music";
import { CreativeInputStep } from "./CreativeInputStep";
import { HomeScreen } from "./HomeScreen";
import { LoadingState } from "./LoadingState";
import { MoodStep } from "./MoodStep";
import { PreferenceStep } from "./PreferenceStep";
import { ResultScreen } from "./ResultScreen";

type Step = "home" | "mood" | "preferences" | "creative" | "loading" | "result";

const emptyInput: MusicGenerationInput = {
  mood: "",
  genres: [],
  artists: "",
  lyrics: "",
  idea: "",
  vocalStyle: "",
  soundDescription: ""
};

const fallbackResult: GeneratedMusicResult = {
  title: "Generated Yumi Track",
  audioUrl: "",
  imageUrl: "",
  videoUrl: ""
};

export function YumiFlow() {
  const [step, setStep] = useState<Step>("home");
  const [input, setInput] = useState<MusicGenerationInput>(emptyInput);
  const [result, setResult] = useState<GeneratedMusicResult | null>(null);

  const goToMood = () => setStep("mood");

  const handleMoodNext = (mood: string) => {
    setInput((current) => ({ ...current, mood }));
    setStep("preferences");
  };

  const handlePreferencesNext = (genres: string[], artists: string) => {
    setInput((current) => ({ ...current, genres, artists }));
    setStep("creative");
  };

  const handleGenerate = async (creativeInput: Partial<MusicGenerationInput>) => {
    const requestInput = { ...input, ...creativeInput };
    setInput(requestInput);
    setStep("loading");

    const loadingStartedAt = Date.now();

    try {
      // Future Suno work should stay behind this server route so client code
      // never has to know about provider credentials or orchestration details.
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestInput)
      });

      if (!response.ok) {
        throw new Error("Failed to generate mock track");
      }

      const generatedResult = (await response.json()) as GeneratedMusicResult;
      setResult(generatedResult);
    } catch {
      setResult(fallbackResult);
    } finally {
      const elapsed = Date.now() - loadingStartedAt;
      const remaining = Math.max(1800 - elapsed, 0);
      window.setTimeout(() => setStep("result"), remaining);
    }
  };

  const handleGenerateAgain = () => {
    setInput(emptyInput);
    setResult(null);
    setStep("mood");
  };

  return (
    <main className="app-shell">
      {step === "home" && <HomeScreen onStart={goToMood} />}
      {step === "mood" && (
        <MoodStep
          initialMood={input.mood}
          onBack={() => setStep("home")}
          onNext={handleMoodNext}
        />
      )}
      {step === "preferences" && (
        <PreferenceStep
          initialArtists={input.artists ?? ""}
          initialGenres={input.genres}
          onBack={() => setStep("mood")}
          onNext={handlePreferencesNext}
        />
      )}
      {step === "creative" && (
        <CreativeInputStep
          initialInput={input}
          onBack={() => setStep("preferences")}
          onGenerate={handleGenerate}
        />
      )}
      {step === "loading" && <LoadingState />}
      {step === "result" && (
        <ResultScreen
          input={input}
          result={result ?? fallbackResult}
          onGenerateAgain={handleGenerateAgain}
        />
      )}
    </main>
  );
}
