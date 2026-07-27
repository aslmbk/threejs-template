import * as THREE from "three/webgpu";

export class Rays {
  private raycaster = new THREE.Raycaster();
  private camera: THREE.Camera | null;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  public updateCamera(camera: THREE.Camera) {
    this.camera = camera;
  }

  public destroy() {
    this.camera = null;
  }

  public castToMany(mouse: THREE.Vector2, objects: THREE.Object3D[]) {
    const camera = this.camera;
    if (!camera) return [];
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObjects(objects);
    return intersects;
  }

  public castToOne(mouse: THREE.Vector2, object: THREE.Object3D) {
    const camera = this.camera;
    if (!camera) return [];
    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObject(object);
    return intersects;
  }
}
