import * as THREE from "three/webgpu";

export type ConfigOptions = {
  debug?: boolean;
  forceWebGL?: boolean;
  maxDevicePixelRatio?: number;
  maxDelta?: number;
  antialias?: boolean;
  cameraFov?: number;
  cameraNear?: number;
  cameraFar?: number;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
  shadows?: boolean;
  shadowMapType?: THREE.ShadowMapType;
};

/**
 * Treats the hash as a parameter list, so `#debug`, `#debug&foo` and `#a=1&debug`
 * all enable it while `#debugger` and `#nodebug` do not.
 */
function hasFlag(name: string): boolean {
  if (typeof location === "undefined") return false;
  return new URLSearchParams(location.hash.slice(1)).has(name);
}

export class Config {
  readonly debug: boolean;
  readonly forceWebGL: boolean;
  readonly maxDevicePixelRatio: number;
  readonly maxDelta: number;
  readonly antialias: boolean;
  readonly cameraFov: number;
  readonly cameraNear: number;
  readonly cameraFar: number;
  readonly toneMapping: THREE.ToneMapping;
  readonly toneMappingExposure: number;
  readonly shadows: boolean;
  readonly shadowMapType: THREE.ShadowMapType;

  constructor(options: ConfigOptions = {}) {
    this.debug = options.debug ?? hasFlag("debug");
    // `#webgl` pins the renderer to the WebGL2 backend. WebGPURenderer already
    // falls back on its own, so this exists to make the fallback path testable
    // on a machine where WebGPU works.
    this.forceWebGL = options.forceWebGL ?? hasFlag("webgl");
    this.maxDevicePixelRatio = options.maxDevicePixelRatio ?? 2;
    this.maxDelta = options.maxDelta ?? 0.1;
    this.antialias = options.antialias ?? true;
    this.cameraFov = options.cameraFov ?? 75;
    this.cameraNear = options.cameraNear ?? 0.1;
    this.cameraFar = options.cameraFar ?? 1000;

    // Tone mapping and shadows default to three's own values, so enabling them
    // stays an explicit choice and the out-of-the-box image does not change.
    this.toneMapping = options.toneMapping ?? THREE.NoToneMapping;
    this.toneMappingExposure = options.toneMappingExposure ?? 1;
    this.shadows = options.shadows ?? false;
    // Only consulted once `shadows` is on, so the softer filter is a safe default.
    this.shadowMapType = options.shadowMapType ?? THREE.PCFSoftShadowMap;
  }
}
