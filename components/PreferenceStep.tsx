"use client";

import { useState } from "react";

type PreferenceStepProps = {
  initialGenres: string[];
  initialArtists: string;
  onBack: () => void;
  onNext: (genres: string[], artists: string) => void;
};

const genres = [
  "Pop",
  "R&B",
  "Indie",
  "K-pop",
  "Hip-hop",
  "Electronic",
  "Rock",
  "Acoustic"
];

export function PreferenceStep({
  initialArtists,
  initialGenres,
  onBack,
  onNext
}: PreferenceStepProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
  const [artists, setArtists] = useState(initialArtists);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]
    );
  };

  return (
    <section className="step-panel">
      <p className="step-kicker">Step 2 of 3</p>
      <h1>Where should Yumi take it?</h1>
      <p className="step-copy">Pick one or more genre lanes and add reference artists if helpful.</p>

      <div className="chip-grid" role="group" aria-label="Genre preferences">
        {genres.map((genre) => (
          <button
            className={selectedGenres.includes(genre) ? "chip selected" : "chip"}
            key={genre}
            type="button"
            onClick={() => toggleGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      <label className="field-group">
        <span>Optional artists</span>
        <input
          placeholder="Example: NewJeans, Frank Ocean, The 1975"
          value={artists}
          onChange={(event) => setArtists(event.target.value)}
        />
      </label>

      <div className="step-actions">
        <button className="secondary-action" type="button" onClick={onBack}>
          Back
        </button>
        <button
          className="primary-action"
          type="button"
          disabled={selectedGenres.length === 0}
          onClick={() => onNext(selectedGenres, artists)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
