"use client";

import { useState } from "react";

type MoodStepProps = {
  initialMood: string;
  onBack: () => void;
  onNext: (mood: string) => void;
};

const moods = [
  "Dreamy",
  "Bittersweet",
  "Confident",
  "Late-night",
  "Tender",
  "Restless",
  "Hopeful",
  "Cinematic"
];

export function MoodStep({ initialMood, onBack, onNext }: MoodStepProps) {
  const [selectedMood, setSelectedMood] = useState(initialMood);
  const selectedMoodIsCustom = selectedMood && !moods.includes(selectedMood);
  const [customMood, setCustomMood] = useState(selectedMoodIsCustom ? selectedMood : "");

  const moodValue = customMood.trim() || selectedMood;

  return (
    <section className="step-panel">
      <p className="step-kicker">Step 1 of 3</p>
      <h1>What should the song feel like?</h1>
      <p className="step-copy">Choose a mood, or write your own emotional direction.</p>

      <div className="chip-grid" role="list" aria-label="Mood options">
        {moods.map((mood) => (
          <button
            className={selectedMood === mood && !customMood ? "chip selected" : "chip"}
            key={mood}
            type="button"
            onClick={() => {
              setCustomMood("");
              setSelectedMood(mood);
            }}
          >
            {mood}
          </button>
        ))}
      </div>

      <label className="field-group">
        <span>Custom mood</span>
        <input
          placeholder="Example: soft but unstoppable"
          value={customMood}
          onChange={(event) => {
            setCustomMood(event.target.value);
            setSelectedMood(event.target.value);
          }}
        />
      </label>

      <div className="step-actions">
        <button className="secondary-action" type="button" onClick={onBack}>
          Back
        </button>
        <button
          className="primary-action"
          type="button"
          disabled={!moodValue}
          onClick={() => onNext(moodValue)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
