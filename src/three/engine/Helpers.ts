import * as THREE from "three";

export class Helpers {
  private readonly scene: THREE.Scene;
  private readonly objects: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addAxesHelper(size: number = 5): THREE.AxesHelper {
    const helper = new THREE.AxesHelper(size);
    this.scene.add(helper);
    this.objects.push(helper);
    return helper;
  }

  public addGridHelper(size: number = 100, divisions: number = 10): THREE.GridHelper {
    const helper = new THREE.GridHelper(size, divisions);
    this.scene.add(helper);
    this.objects.push(helper);
    return helper;
  }

  public addCameraHelper(camera: THREE.Camera): THREE.CameraHelper {
    const helper = new THREE.CameraHelper(camera);
    this.scene.add(helper);
    this.objects.push(helper);
    return helper;
  }

  public addDirectionalLightHelper(light: THREE.DirectionalLight): THREE.DirectionalLightHelper {
    const helper = new THREE.DirectionalLightHelper(light);
    this.scene.add(helper);
    this.objects.push(helper);
    return helper;
  }

  public destroy(): void {
    for (const obj of this.objects) {
      this.scene.remove(obj);
      if ("dispose" in obj && typeof obj.dispose === "function") {
        (obj as { dispose: () => void }).dispose();
      }
    }
    this.objects.length = 0;
  }
}
