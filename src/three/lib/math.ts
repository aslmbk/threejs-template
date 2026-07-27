import MersenneTwister from "mersennetwister";
import * as THREE from "three";

/** Seed shared by `random` and the noise module, so both reproduce across reloads. */
export const DEFAULT_SEED = 1;

/**
 * Builds an independent, reproducible PRNG stream. Prefer this over reaching for
 * the shared `random` when a subsystem wants its own sequence — one per emitter,
 * for instance — so that consuming values in one place cannot shift another.
 */
export const createRandom = (seed: number = DEFAULT_SEED): (() => number) => {
  const mt = new MersenneTwister(seed);
  return mt.random.bind(mt);
};

export const random = createRandom();

export const saturate = (v: number) => Math.min(1, Math.max(0, v));

export const inverseLerp = (a: number, b: number, v: number) =>
  saturate((v - a) / (b - a));

export const remap = (a: number, b: number, c: number, d: number, v: number) =>
  c + (d - c) * inverseLerp(a, b, v);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export interface Frame<T = number[]> {
  time: number;
  value: T;
}

/** Bounds for the ramp textures produced by `toTexture()`. */
const MIN_RAMP_WIDTH = 2;
const MAX_RAMP_WIDTH = 1024;
const STEP_EPSILON = 1e-6;

/**
 * Half float rather than full float: linear filtering of 32-bit float textures
 * requires `OES_texture_float_linear`, which a lot of mobile GPUs do not expose.
 * Half float sampling is core in WebGL2 and carries far more precision than a
 * 0..1 ramp needs.
 */
function createRampTexture(
  data: Uint16Array,
  width: number,
  format: THREE.PixelFormat,
): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    data,
    width,
    1,
    format,
    THREE.HalfFloatType,
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export class Interpolant<T = number[]> {
  private readonly interpolator: THREE.Interpolant;
  protected readonly frames: Frame[];
  protected readonly frameBuffer: Float32Array;

  constructor(frames: Frame[]) {
    if (frames.length === 0) {
      throw new Error("Interpolant: expected at least one frame");
    }

    // Copied before sorting — the caller's array belongs to the caller.
    this.frames = [...frames].sort((a, b) => a.time - b.time);

    const stride = this.frames[0].value.length;
    if (stride === 0) {
      throw new Error("Interpolant: frame values must not be empty");
    }

    const times: number[] = [];
    const values: number[] = [];

    for (const frame of this.frames) {
      if (frame.value.length !== stride) {
        throw new Error(
          `Interpolant: every frame needs ${stride} components, got ${frame.value.length}`,
        );
      }
      times.push(frame.time);
      values.push(...frame.value);
    }

    this.frameBuffer = new Float32Array(stride);
    this.interpolator = new THREE.LinearInterpolant(
      new Float32Array(times),
      new Float32Array(values),
      stride,
      this.frameBuffer,
    );
  }

  /** Time of the last frame — the upper end of this interpolant's domain. */
  public get maxTime(): number {
    return this.frames[this.frames.length - 1].time;
  }

  /**
   * Width `toTexture()` samples at: fine enough to resolve the shortest gap
   * between frames, and bounded so degenerate input cannot ask for a huge
   * allocation (two frames at nearly the same time would otherwise divide by
   * something arbitrarily close to zero).
   */
  public get rampWidth(): number {
    const maxTime = this.maxTime;
    if (!(maxTime > 0)) return MIN_RAMP_WIDTH;

    let smallestStep = 0.5;
    for (let i = 1; i < this.frames.length; i++) {
      const step = (this.frames[i].time - this.frames[i - 1].time) / maxTime;
      if (step > STEP_EPSILON) smallestStep = Math.min(smallestStep, step);
    }

    const width = Math.ceil(1 / smallestStep) + 1;
    return Math.min(Math.max(width, MIN_RAMP_WIDTH), MAX_RAMP_WIDTH);
  }

  /**
   * Evaluates into the shared frame buffer and hands it back without
   * allocating. The contents are overwritten by the next call — copy anything
   * you need to keep.
   */
  public evaluateRaw(time: number): Float32Array {
    this.interpolator.evaluate(time);
    return this.frameBuffer;
  }

  /** Convenience wrapper around `evaluateRaw`; allocates a fresh result. */
  public evaluate(time: number): T {
    this.interpolator.evaluate(time);
    return this.result;
  }

  public get result(): T {
    return Array.from(this.frameBuffer) as T;
  }
}

export class Vector3Interpolant extends Interpolant<THREE.Vector3> {
  constructor(frames: Frame<THREE.Vector3>[]) {
    super(
      frames.map((frame) => ({
        time: frame.time,
        value: [frame.value.x, frame.value.y, frame.value.z],
      })),
    );
  }

  public override get result(): THREE.Vector3 {
    return new THREE.Vector3(
      this.frameBuffer[0],
      this.frameBuffer[1],
      this.frameBuffer[2],
    );
  }

  /** Allocation-free `evaluate` for per-frame use. */
  public evaluateTo(time: number, target: THREE.Vector3): THREE.Vector3 {
    const buffer = this.evaluateRaw(time);
    return target.set(buffer[0], buffer[1], buffer[2]);
  }
}

export class FloatInterpolant extends Interpolant<number> {
  constructor(frames: Frame<number>[]) {
    super(frames.map((frame) => ({ time: frame.time, value: [frame.value] })));
  }

  public override get result(): number {
    return this.frameBuffer[0];
  }

  public toTexture(): THREE.DataTexture {
    const width = this.rampWidth;
    const maxTime = this.maxTime;
    const data = new Uint16Array(width);

    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      data[i] = THREE.DataUtils.toHalfFloat(this.evaluate(t * maxTime));
    }

    return createRampTexture(data, width, THREE.RedFormat);
  }
}

export class ColorInterpolant extends Interpolant<THREE.Color> {
  constructor(frames: Frame<THREE.Color>[]) {
    super(
      frames.map((frame) => ({
        time: frame.time,
        value: [frame.value.r, frame.value.g, frame.value.b],
      })),
    );
  }

  public override get result(): THREE.Color {
    return new THREE.Color(
      this.frameBuffer[0],
      this.frameBuffer[1],
      this.frameBuffer[2],
    );
  }

  /** Allocation-free `evaluate` for per-frame use. */
  public evaluateTo(time: number, target: THREE.Color): THREE.Color {
    const buffer = this.evaluateRaw(time);
    return target.setRGB(buffer[0], buffer[1], buffer[2]);
  }

  /**
   * Bakes the ramp into an RGBA texture. When an alpha ramp is supplied it is
   * sampled across its own domain at the same normalized positions, so both
   * curves line up in the result.
   */
  public toTexture(alpha?: FloatInterpolant): THREE.DataTexture {
    const width = Math.max(this.rampWidth, alpha?.rampWidth ?? 0);
    const maxTime = this.maxTime;
    const alphaMaxTime = alpha?.maxTime ?? 0;

    const data = new Uint16Array(width * 4);
    const color = new THREE.Color();

    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      this.evaluateTo(t * maxTime, color);

      const i4 = i * 4;
      data[i4 + 0] = THREE.DataUtils.toHalfFloat(color.r);
      data[i4 + 1] = THREE.DataUtils.toHalfFloat(color.g);
      data[i4 + 2] = THREE.DataUtils.toHalfFloat(color.b);
      data[i4 + 3] = THREE.DataUtils.toHalfFloat(
        alpha ? alpha.evaluate(t * alphaMaxTime) : 1,
      );
    }

    return createRampTexture(data, width, THREE.RGBAFormat);
  }
}
