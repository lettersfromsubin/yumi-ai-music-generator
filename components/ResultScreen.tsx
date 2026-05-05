import type { GeneratedMusicResult, MusicGenerationInput } from "@/types/music";

type ResultScreenProps = {
  input: MusicGenerationInput;
  result: GeneratedMusicResult;
  onGenerateAgain: () => void;
};

export function ResultScreen({ input, result, onGenerateAgain }: ResultScreenProps) {
  const genreLine = input.genres.length ? input.genres.join(", ") : "No genre selected";

  return (
    <section className="result-panel">
      <div className="result-header">
        <div>
          <p className="step-kicker">Yumi Result</p>
          <h1>{result.title}</h1>
          <p className="step-copy">
            {input.mood || "Untitled mood"} with {genreLine}
          </p>
        </div>
        <button className="secondary-action" type="button" onClick={onGenerateAgain}>
          Generate Again
        </button>
      </div>

      <div className="result-grid">
        <div className="media-block album-block">
          <p className="media-label">Album cover</p>
          {result.imageUrl ? (
            <img src={result.imageUrl} alt={`${result.title} album cover`} />
          ) : (
            <div className="album-placeholder">
              <span>Yumi</span>
              <strong>{input.mood || "New Track"}</strong>
            </div>
          )}
        </div>

        <div className="media-block audio-block">
          <p className="media-label">Audio</p>
          {result.audioUrl ? (
            <audio controls src={result.audioUrl}>
              <track kind="captions" />
            </audio>
          ) : (
            <div className="audio-placeholder">
              <button type="button" aria-label="Audio preview placeholder">
                <span />
              </button>
              <div className="waveform" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <div className="media-block video-block">
          <p className="media-label">Video</p>
          {result.videoUrl ? (
            <video controls src={result.videoUrl} />
          ) : (
            <div className="video-placeholder">
              <div className="play-mark" />
              <span>Video placeholder</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
