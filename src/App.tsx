import { useEffect, useRef } from "react";
import { Experience } from "./three/Experience";
import "./App.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const experience = Experience.getInstance(container);

    return () => {
      experience.destroy();
    };
  }, []);

  return <div className="App" ref={containerRef} />;
}
