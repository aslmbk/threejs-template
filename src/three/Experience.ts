import { World } from "./Engine";
import * as THREE from "three";
import { SelectiveBloom } from "./SelectiveBloom";

export class Experience {
  private world: World;
  private cube: THREE.Mesh;
  private sphere: THREE.Mesh;
  private bloom: SelectiveBloom;

  constructor(domElement: HTMLElement) {
    this.world = new World({ domElement, autoRender: false });
    this.bloom = new SelectiveBloom(this.world, {
      threshold: 0,
      strength: 0.5,
      radius: 0.1,
      exposure: 1,
    });

    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: "blue" })
    );
    this.cube.position.set(-1, 0, 0);
    this.world.scene.add(this.cube);

    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: "red" })
    );
    this.sphere.position.set(1, 0, 0);
    this.world.scene.add(this.sphere);

    this.bloom.toggleBloom(this.sphere);

    this.world.time.events.on("tick", ({ elapsed }) => {
      this.animate(elapsed);
    });
    this.world.time.events.on(
      "tick",
      () => {
        this.bloom.render();
      },
      5
    );
  }

  private animate(elapsed: number) {
    this.cube.rotation.x = elapsed;
    this.cube.rotation.y = elapsed;
  }

  public dispose() {
    this.world.dispose();
  }
}
