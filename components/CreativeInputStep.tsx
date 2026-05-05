"use client";

import { useState } from "react";
import type { MusicGenerationInput } from "@/types/music";

type CreativeInputStepProps = {
  initialInput: MusicGenerationInput;
  onBack: () => void;
  onGenerate: (input: Partial<MusicGenerationInput>) => void;
};

export function CreativeInputStep({ initialInput, onBack, onGenerate }: CreativeInputStepProps) {
  const [lyrics, setLyrics] = useState(initialInput.lyrics ?? "");
  const [idea, setIdea] = useState(initialInput.idea ?? "");
  const [vocalStyle, setVocalStyle] = useState(initialInput.vocalStyle ?? "");
  const [soundDescription, setSoundDescription] = useState(initialInput.soundDescription ?? "");

  const hasCreativeInput =
    lyrics.trim() || idea.trim() || vocalStyle.trim() || soundDescription.trim();

  return (
    <section className="step-panel wide-panel">
      <p className="step-kicker">Step 3 of 3</p>
      <h1>Add the creative spark.</h1>
      <p className="step-copy">Capture the words, story, voice, and sonic texture for this track.</p>

      <div className="form-grid">
        <label className="field-group">
          <span>Lyrics</span>
          <textarea
            placeholder="Paste lyrics, a chorus, or a few lines."
            rows={7}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
          />
        </label>

        <label className="field-group">
          <span>Song idea</span>
          <textarea
            placeholder="Example: a quiet city walk after a breakup, but it turns hopeful."
            rows={7}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
          />
        </label>

        <label className="field-group">
          <span>Vocal style</span>
          <input
            placeholder="Example: airy female vocal, close-mic, gentle harmonies"
            value={vocalStyle}
            onChange={(event) => setVocalStyle(event.target.value)}
          />
        </label>

        <label className="field-group">
          <span>Sound description</span>
          <input
            placeholder="Example: warm bass, clean drums, glassy synths"
            value={soundDescription}
            onChange={(event) => setSoundDescription(event.target.value)}
          />
        </label>
      </div>

      <div className="step-actions">
        <button className="secondary-action" type="button" onClick={onBack}>
          Back
        </button>
        <button
          className="primary-action"
          type="button"
          disabled={!hasCreativeInput}
          onClick={() =>
            onGenerate({
              lyrics,
              idea,
              vocalStyle,
              soundDescription
            })
          }
        >
          Generate
        </button>
      </div>
    </section>
  );
}
