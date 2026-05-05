type HomeScreenProps = {
  onStart: () => void;
};

export function HomeScreen({ onStart }: HomeScreenProps) {
  return (
    <section className="home-layout">
      <div className="home-copy">
        <p className="eyebrow">Yumi</p>
        <h1>Shape a song from the feeling first.</h1>
        <p className="lede">
          Yumi guides a music idea from mood to genre to creative direction, then prepares a
          generated track package for the next stage of the product.
        </p>
        <button className="primary-action" type="button" onClick={onStart}>
          Start
        </button>
      </div>

      <div className="studio-panel" aria-label="Yumi generation preview">
        <div className="track-card">
          <div className="mini-cover" />
          <div>
            <p className="track-label">Next track</p>
            <h2>Untitled feeling</h2>
          </div>
        </div>
        <div className="signal-list">
          <div>
            <span>Mood</span>
            <strong>Open</strong>
          </div>
          <div>
            <span>Genre</span>
            <strong>Pending</strong>
          </div>
          <div>
            <span>Voice</span>
            <strong>Pending</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
