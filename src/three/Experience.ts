import { Engine } from "./engine";
import { DebugController } from "./DebugController";
import { Config } from "./Config";
import * as THREE from "three";

export class Experience extends Engine {
  private static instance: Experience | null = null;

  public readonly config!: Config;
  public readonly debugController!: DebugController;

  constructor(domElement: HTMLElement) {
    if (Experience.instance) return Experience.instance;
    super({ domElement });
    Experience.instance = this;

    this.config = new Config();
    this.debugController = new DebugController();

    this.createTemplate();
  }

  private createTemplate() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    this.scene.add(mesh);

    this.time.events.on("tick", ({ delta }) => {
      mesh.rotation.x += delta;
      mesh.rotation.y += delta;
    });
  }
}
