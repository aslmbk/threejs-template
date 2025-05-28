import MersenneTwister from "mersennetwister";
import * as THREE from "three";

const mt = new MersenneTwister(1);
export const random = mt.random.bind(mt);

interface Frame<T = number[]> {
  time: number;
  value: T;
}

export class Interpolant<T = number[]> {
  private readonly interpolator: THREE.Interpolant;
  protected readonly frames: Frame[];
  protected readonly frameBuffer: Float32Array;

  constructor(frames: Frame[]) {
    this.frames = frames;
    this.frames.sort((a, b) => a.time - b.time);
    const times: Frame["time"][] = [];
    const values: Frame["value"] = [];

    frames.forEach((frame) => {
      times.push(frame.time);
      values.push(...frame.value);
    });

    const stride = frames[0].value.length;

    this.frameBuffer = new Float32Array(stride);
    this.interpolator = new THREE.LinearInterpolant(
      times,
      values,
      stride,
      this.frameBuffer
    );
  }

  public evaluate(time: Frame["time"]) {
    this.interpolator.evaluate(time);
    return this.result;
  }

  public get result(): T {
    return Array.from(this.frameBuffer) as T;
  }
}

export class Vector3Interpolant extends Interpolant<THREE.Vector3> {
  constructor(frames: Frame<THREE.Vector3>[]) {
    const framesWithValues = frames.map((frame) => ({
      time: frame.time,
      value: [frame.value.x, frame.value.y, frame.value.z],
    }));
    super(framesWithValues);
  }

  public get result() {
    return new THREE.Vector3(
      this.frameBuffer[0],
      this.frameBuffer[1],
      this.frameBuffer[2]
    );
  }
}

export class FloatInterpolant extends Interpolant<number> {
  constructor(frames: Frame<number>[]) {
    const framesWithValues = frames.map((frame) => ({
      time: frame.time,
      value: [frame.value],
    }));
    super(framesWithValues);
  }

  get result() {
    return this.frameBuffer[0];
  }

  public toTexture() {
    const maxFrameTime = this.frames[this.frames.length - 1].time;

    let smallestStep = 0.5;
    for (let i = 1; i < this.frames.length - 1; i++) {
      const stepSize =
        (this.frames[i].time - this.frames[i - 1].time) / maxFrameTime;
      smallestStep = Math.min(smallestStep, stepSize);
    }

    const width = Math.ceil(1 / smallestStep) + 1;
    const data = new Float32Array(width);

    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      data[i] = this.evaluate(t * maxFrameTime);
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      1,
      THREE.RedFormat,
      THREE.FloatType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }
}

export class ColorInterpolant extends Interpolant<THREE.Color> {
  constructor(frames: Frame<THREE.Color>[]) {
    const framesWithValues = frames.map((frame) => ({
      time: frame.time,
      value: [frame.value.r, frame.value.g, frame.value.b],
    }));
    super(framesWithValues);
  }

  get result() {
    return new THREE.Color(
      this.frameBuffer[0],
      this.frameBuffer[1],
      this.frameBuffer[2]
    );
  }

  public toTexture(alphaInterpolant?: FloatInterpolant) {
    let ai = alphaInterpolant;
    const maxFrameTime = this.frames[this.frames.length - 1].time;

    let smallestStep = 0.5;
    for (let i = 1; i < this.frames.length - 1; i++) {
      const stepSize =
        (this.frames[i].time - this.frames[i - 1].time) / maxFrameTime;
      smallestStep = Math.min(smallestStep, stepSize);
    }

    let width = Math.ceil(1 / smallestStep) + 1;

    if (alphaInterpolant) {
      const alphaTexture = alphaInterpolant.toTexture();
      const alphaTextureWidth = alphaTexture.image.width;
      const alphaData: Frame<number>[] = [];

      for (let i = 0; i < alphaTextureWidth; i++) {
        alphaData.push({
          time: i / (alphaTextureWidth - 1),
          value: (alphaTexture.image.data as Float32Array)[i],
        });
      }

      ai = new FloatInterpolant(alphaData);
      width = Math.max(width, alphaTextureWidth);
    }

    const data = new Float32Array(width * 4);

    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      const color = this.evaluate(t * maxFrameTime);
      data[i * 4 + 0] = color.r;
      data[i * 4 + 1] = color.g;
      data[i * 4 + 2] = color.b;
      data[i * 4 + 3] = ai?.evaluate(t) ?? 1;
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }
}
