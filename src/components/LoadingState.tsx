import { useEffect, useState } from "react";
import "./LoadingState.css";

const LINES = [
  "Sniffing out the breed…",
  "Consulting the good boys…",
  "Measuring the floof…",
  "Checking the snoot database…",
];

/** Playful full-screen loader shown while the vision API works. */
export function LoadingState() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="loading">
      <div className="loading-nose" aria-hidden="true">
        🐽
      </div>
      <div className="loading-sniff">
        <span />
        <span />
        <span />
      </div>
      <p className="loading-text">{LINES[i]}</p>
    </div>
  );
}
