import { createNoise2D } from "simplex-noise";
import { createRandom, DEFAULT_SEED } from "./math";

/**
 * Builds a seeded 2D simplex source. Seeding matters: the unseeded
 * `createNoise2D()` falls back to `Math.random`, which would make the noise
 * differ on every reload while the rest of the library stays reproducible.
 * Each call gets its own PRNG stream, so building a source never shifts the
 * sequence handed out by `MATH.random`.
 */
export const createNoise = (seed: number = DEFAULT_SEED) =>
  createNoise2D(createRandom(seed));

const source = createNoise();

export const noise2D = (x: number, y: number) => source(x, y);

/**
 * Holds the second axis fixed instead of sampling the diagonal `(x, x)`, which
 * has reduced variance and a visible directional artifact.
 */
export const noise1D = (x: number) => source(x, 0);
