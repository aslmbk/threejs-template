import { useEffect, useRef } from "react";
import { Experience } from "./three/Experience";
import "./App.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const experienceRef = useRef<Experience | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const experience = Experience.getInstance(container);
    experienceRef.current = experience;

    return () => {
      experience.destroy();
      experienceRef.current = null;
    };
  }, []);

  return <div className="App" ref={containerRef} />;
}
