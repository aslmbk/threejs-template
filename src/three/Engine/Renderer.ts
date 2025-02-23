import * as THREE from "three";
import { World } from "./World";

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private world: World;
  private autoRender: boolean;

  constructor(autoRender: boolean = true) {
    this.world = World.getInstance();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.world.domElement.appendChild(this.renderer.domElement);

    this.autoRender = autoRender;

    this.resize();
    this.render();
    this.world.viewport.events.on("change", () => {
      this.resize();
    });
    this.world.time.events.on(
      "tick",
      () => {
        if (this.autoRender) {
          this.render();
        }
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

  public render() {
    this.renderer.render(this.world.scene.getScene(), this.world.view.camera);
  }

  public stop() {
    this.autoRender = false;
  }

  public start() {
    this.autoRender = true;
  }

  public getDomElement() {
    return this.renderer.domElement;
  }

  public getWebGLRenderer() {
    return this.renderer;
  }

  public setClearColor(color: THREE.ColorRepresentation) {
    this.renderer.setClearColor(color);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
