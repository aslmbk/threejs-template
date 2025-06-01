import { createNoise2D } from "simplex-noise";

const twoDNoiseCreator = createNoise2D();

export const noise1D = (x: number) => twoDNoiseCreator(x, x);

export const noise2D = (x: number, y: number) => twoDNoiseCreator(x, y);
