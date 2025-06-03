import "./App.css";
import { useEffect, useRef } from "react";
import { Experience } from "./three/Experience";

export const App = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    new Experience(containerRef.current);
  }, []);

  return <div className="App" ref={containerRef} />;
};
