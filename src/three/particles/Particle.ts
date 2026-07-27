import * as THREE from "three";

export class Particle {
  /**
   * Per-particle random value in [0, 1), uploaded to the shader as a stable
   * seed for phase offsets. Not an identifier — it is not unique and carries no
   * ordering.
   */
  public seed = 0;
  public life = 0;
  public maxLife = 0;
  public readonly position = new THREE.Vector3();
  public readonly velocity = new THREE.Vector3();
}
