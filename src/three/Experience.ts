import { Engine } from "./Engine";
import { DebugController } from "./DebugController";
import { Config } from "./Config";
import * as THREE from "three";
import { SelectiveBloom } from "./SelectiveBloom";

export class Experience extends Engine {
  public readonly config: Config;
  public readonly debugController: DebugController;

  private selectiveBloom: SelectiveBloom;

  constructor(domElement: HTMLElement) {
    super({ domElement, autoRender: false });
    this.config = new Config();
    this.debugController = new DebugController(this);
    this.stats.activate();

    this.selectiveBloom = new SelectiveBloom(this);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube1 = new THREE.Mesh(geometry, material);
    cube1.position.x = -2;
    this.scene.add(cube1);

    const cube2 = new THREE.Mesh(geometry, material);
    cube2.position.x = 2;
    this.selectiveBloom.toggleBloom(cube2);
    this.scene.add(cube2);

    this.time.events.on(
      "tick",
      () => {
        this.selectiveBloom.render();
      },
      5
    );
  }

  public dispose() {
    this.stats.deactivate();
    this.debug.children.forEach((child) => child.dispose());
    this.scene.dispose();
  }
}
