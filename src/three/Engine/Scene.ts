import * as THREE from "three";

export class Scene {
  private _scene = new THREE.Scene();

  public add(object: THREE.Object3D) {
    this._scene.add(object);
  }

  public remove(object: THREE.Object3D) {
    this._scene.remove(object);
  }

  public getScene() {
    return this._scene;
  }

  public dispose() {
    this._scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        for (const key in child.material) {
          const value = child.material[key];
          if (value && typeof value.dispose === "function") {
            value.dispose();
          }
        }
      }
    });
    this._scene.clear();
  }
}
