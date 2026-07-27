import { useEffect, useRef, useState } from "react";
import { Experience } from "./three/Experience";
import "./App.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [startupError, setStartupError] = useState<Error | null>(null);

  // Rethrowing during render is what carries a startup failure to the
  // ErrorBoundary. A boundary only catches what is thrown while React renders,
  // and the GPU device is acquired asynchronously, long after the effect below
  // has returned — so the rejection has to become state first, then a throw.
  if (startupError !== null) throw startupError;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Synchronous failures (an already-initialized singleton on a different
    // element) reach the boundary on their own.
    const experience = Experience.getInstance(container);

    let cancelled = false;
    experience.engine.ready.catch((error: unknown) => {
      // A StrictMode unmount tears this engine down while the device is still
      // being acquired; that rejection belongs to a dead engine, not the page.
      if (cancelled) return;
      setStartupError(error instanceof Error ? error : new Error(String(error)));
    });

    return () => {
      cancelled = true;
      experience.destroy();
    };
  }, []);

  return <div className="App" ref={containerRef} />;
}
