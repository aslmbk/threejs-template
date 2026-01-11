import * as THREE from "three";

export class Particle {
  public id = 0;
  public life = 0;
  public maxLife = 0;
  public readonly position = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();
}
