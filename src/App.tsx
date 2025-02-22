import "./App.css";
import { World } from "./three/World";
import { useEffect, useRef } from "react";

export const App = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const world = new World(containerRef.current);
    return () => {
      world.dispose();
    };
  }, []);

  return <div className="App" ref={containerRef} />;
};
