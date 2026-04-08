export class Config {
  readonly debug: boolean;
  readonly maxDevicePixelRatio: number;
  readonly antialias: boolean;
  readonly cameraFov: number;
  readonly cameraNear: number;
  readonly cameraFar: number;

  constructor() {
    this.debug =
      typeof location !== "undefined" && location.hash.includes("debug");
    this.maxDevicePixelRatio = 2;
    this.antialias = true;
    this.cameraFov = 75;
    this.cameraNear = 0.1;
    this.cameraFar = 1000;
  }
}
