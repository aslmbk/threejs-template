import { World } from "./World";
import * as THREE from "three";

export class View {
  private world: World;
  public camera: THREE.PerspectiveCamera;

  constructor() {
    this.world = World.getInstance();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.world.viewport.ratio,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);
    this.world.scene.add(this.camera);

    this.world.viewport.events.on("change", () => {
      this.resize();
    });
  }

  private resize() {
    this.camera.aspect = this.world.viewport.ratio;
    this.camera.updateProjectionMatrix();
  }

  public dispose() {}
}
