import * as THREE from "three";

export class Rays {
  private raycaster = new THREE.Raycaster();
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public cast(mouse: THREE.Vector2, objects: THREE.Object3D[]) {
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects);
    return intersects;
  }
}
