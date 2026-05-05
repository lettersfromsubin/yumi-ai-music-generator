"use client";

import { useEffect, useState } from "react";

const messages = [
  "Listening for the emotional center...",
  "Finding the rhythm under the words...",
  "Sketching the cover from the sound palette...",
  "Preparing the first Yumi result..."
];

export function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 650);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="loading-panel" aria-live="polite" aria-busy="true">
      <div className="pulse-disc">
        <span />
      </div>
      <p className="step-kicker">Generating</p>
      <h1>{messages[messageIndex]}</h1>
      <div className="loading-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}
