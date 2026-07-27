import { useEffect, useRef } from "react";
import { Experience } from "./three/Experience";
import "./App.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // A failure here (no WebGL context, for instance) propagates to the
    // ErrorBoundary in main.tsx rather than blanking the page.
    const experience = Experience.getInstance(container);

    return () => {
      experience.destroy();
    };
  }, []);

  return <div className="App" ref={containerRef} />;
}
