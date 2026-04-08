export type ConfigOptions = {
  debug?: boolean;
  maxDevicePixelRatio?: number;
  antialias?: boolean;
  cameraFov?: number;
  cameraNear?: number;
  cameraFar?: number;
};

export class Config {
  readonly debug: boolean;
  readonly maxDevicePixelRatio: number;
  readonly antialias: boolean;
  readonly cameraFov: number;
  readonly cameraNear: number;
  readonly cameraFar: number;

  constructor(options: ConfigOptions = {}) {
    this.debug =
      options.debug ??
      (typeof location !== "undefined" && location.hash.includes("debug"));
    this.maxDevicePixelRatio = options.maxDevicePixelRatio ?? 2;
    this.antialias = options.antialias ?? true;
    this.cameraFov = options.cameraFov ?? 75;
    this.cameraNear = options.cameraNear ?? 0.1;
    this.cameraFar = options.cameraFar ?? 1000;
  }
}
