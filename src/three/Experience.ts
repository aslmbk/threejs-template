import { World } from "./Engine";
import * as THREE from "three";

export class Experience {
  private world: World;
  private cube: THREE.Mesh;

  constructor(domElement: HTMLElement) {
    this.world = new World(domElement);

    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshNormalMaterial()
    );
    this.world.scene.add(this.cube);

    this.world.time.events.on("tick", ({ elapsed }) => {
      this.animate(elapsed);
    });
  }

  private animate(elapsed: number) {
    this.cube.rotation.x = elapsed;
    this.cube.rotation.y = elapsed;
  }

  public dispose() {
    this.world.dispose();
  }
}
