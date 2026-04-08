import * as THREE from "three";

export type EnvironmentApplyOptions = {
  setEnvironment?: boolean;
  setBackground?: boolean;
  environmentIntensity?: number;
  environmentRotation?: THREE.Euler;
  backgroundBlurriness?: number;
  backgroundIntensity?: number;
  backgroundRotation?: THREE.Euler;
};

export function applyEnvironmentToScene(
  scene: THREE.Scene,
  environmentMap: THREE.Texture,
  options: EnvironmentApplyOptions,
): void {
  if (!options.setEnvironment && !options.setBackground) return;
  if (options.setEnvironment) {
    scene.environment = environmentMap;
  }
  if (options.environmentIntensity !== void 0) {
    scene.environmentIntensity = options.environmentIntensity;
  }
  if (options.environmentRotation) {
    scene.environmentRotation = options.environmentRotation;
  }
  if (options.setBackground) {
    scene.background = environmentMap;
  }
  if (options.backgroundBlurriness !== void 0) {
    scene.backgroundBlurriness = options.backgroundBlurriness;
  }
  if (options.backgroundIntensity !== void 0) {
    scene.backgroundIntensity = options.backgroundIntensity;
  }
  if (options.backgroundRotation) {
    scene.backgroundRotation = options.backgroundRotation;
  }
}
