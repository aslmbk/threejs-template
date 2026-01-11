import type { Particle } from "./Particle";

export type Time = {
  delta: number;
  elapsed: number;
};

export type RandomFn = () => number;

export type ParticleCallback = (particle: Particle) => void;
