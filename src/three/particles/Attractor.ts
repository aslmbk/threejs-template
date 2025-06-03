import * as THREE from "three";

export class Attractor {
  public readonly position: THREE.Vector3;
  public readonly intensity: number;
  public readonly radius: number;

  constructor(position: THREE.Vector3, intensity: number, radius: number) {
    this.position = position;
    this.intensity = intensity;
    this.radius = radius;
  }
}
