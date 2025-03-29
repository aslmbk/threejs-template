import * as THREE from "three";

export class Rays {
  private raycaster = new THREE.Raycaster();
  private camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public updateCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  public castToMany(mouse: THREE.Vector2, objects: THREE.Object3D[]) {
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(objects);
    return intersects;
  }

  public castToOne(mouse: THREE.Vector2, object: THREE.Object3D) {
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(object);
    return intersects;
  }
}
