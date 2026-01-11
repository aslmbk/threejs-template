import type { Particle } from "./Particle";
import type { RandomFn } from "./types";

export interface EmitterShape {
  emit(particle: Particle, random: RandomFn): void;
}

export class PointShape implements EmitterShape {
  emit(particle: Particle, _random: RandomFn): void {
    void _random;
    particle.position.set(0, 0, 0);
  }
}
