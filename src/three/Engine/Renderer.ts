import * as THREE from "three";
import { World } from "./World";

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private world: World;

  constructor() {
    this.world = World.getInstance();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.world.domElement.appendChild(this.renderer.domElement);

    this.resize();
    this.render();
    this.world.viewport.events.on("change", () => {
      this.resize();
    });
    this.world.time.events.on(
      "tick",
      () => {
        this.render();
      },
      5
    );
  }

  private resize() {
    this.renderer.setSize(
      this.world.viewport.width,
      this.world.viewport.height
    );
    this.renderer.setPixelRatio(this.world.viewport.pixelRatio);
  }

  private render() {
    this.renderer.render(this.world.scene.getScene(), this.world.view.camera);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
