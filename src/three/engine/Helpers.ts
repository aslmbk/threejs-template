import * as THREE from "three";

/** Every three helper exposes dispose(), but Object3D itself does not declare it. */
function disposeHelper(helper: THREE.Object3D): void {
  const disposable = helper as THREE.Object3D & { dispose?: () => void };
  disposable.dispose?.();
}

export class Helpers {
  private readonly scene: THREE.Scene;
  private readonly objects: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private track<T extends THREE.Object3D>(helper: T): T {
    this.scene.add(helper);
    this.objects.push(helper);
    return helper;
  }

  public addAxesHelper(size: number = 5): THREE.AxesHelper {
    return this.track(new THREE.AxesHelper(size));
  }

  public addGridHelper(
    size: number = 100,
    divisions: number = 10,
  ): THREE.GridHelper {
    return this.track(new THREE.GridHelper(size, divisions));
  }

  public addCameraHelper(camera: THREE.Camera): THREE.CameraHelper {
    return this.track(new THREE.CameraHelper(camera));
  }

  public addDirectionalLightHelper(
    light: THREE.DirectionalLight,
  ): THREE.DirectionalLightHelper {
    return this.track(new THREE.DirectionalLightHelper(light));
  }

  /**
   * Removes and disposes a single helper. Returns false when it is not tracked
   * here, so it is safe to call with an already-removed helper.
   */
  public remove(helper: THREE.Object3D): boolean {
    const index = this.objects.indexOf(helper);
    if (index === -1) return false;

    this.objects.splice(index, 1);
    this.scene.remove(helper);
    disposeHelper(helper);
    return true;
  }

  public destroy(): void {
    for (const helper of this.objects) {
      this.scene.remove(helper);
      disposeHelper(helper);
    }
    this.objects.length = 0;
  }
}
