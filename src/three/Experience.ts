import { Engine } from "./Engine";
import * as THREE from "three";
import { Lights } from "./Lights";
import { SelectiveBloom } from "./SelectiveBloom";

export class Experience extends Engine {
  private lights: Lights;
  private cube: THREE.Mesh | null = null;
  private sphere: THREE.Mesh | null = null;
  private bloom: SelectiveBloom;

  constructor(domElement: HTMLElement) {
    super({ domElement });
    this.lights = new Lights();

    this.bloom = new SelectiveBloom(this, {
      threshold: 0,
      strength: 0.5,
      radius: 0.1,
      exposure: 1,
    });

    this.time.events.on("tick", ({ elapsed }) => {
      this.animate(elapsed);
    });
    this.time.events.on(
      "tick",
      () => {
        this.bloom.render();
      },
      5
    );

    this.createLights();
    this.createObjects();
  }

  private createLights() {
    const directionalLight = this.lights.createDirectionalLight({
      color: "white",
      intensity: 2,
      position: new THREE.Vector3(1, 1, 1),
    });
    this.scene.add(directionalLight);

    const ambientLight = this.lights.createAmbientLight({
      color: "white",
      intensity: 0.5,
    });
    this.scene.add(ambientLight);
  }

  private createObjects() {
    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: "blue" })
    );
    this.cube.position.set(-1, 0, 0);
    this.scene.add(this.cube);

    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 32),
      new THREE.MeshBasicMaterial({ color: "red" })
    );
    this.sphere.position.set(1, 0, 0);
    this.scene.add(this.sphere);
    this.bloom.toggleBloom(this.sphere);
  }

  private animate(elapsed: number) {
    if (this.cube) {
      this.cube.rotation.x = elapsed;
      this.cube.rotation.y = elapsed;
    }
  }

  public dispose() {
    this.scene.dispose();
  }
}
