import * as THREE from "three/webgpu";
import type { Time, TimeEventArgs } from "../engine/Time";
import type { SceneModule } from "./SceneModule";

export class DemoScene implements SceneModule {
  private readonly mesh: THREE.Mesh;
  private readonly time: Time;
  private readonly onTick: (args: TimeEventArgs) => void;

  constructor(scene: THREE.Scene, time: Time) {
    this.time = time;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
    );
    scene.add(this.mesh);

    this.onTick = ({ delta }) => {
      this.mesh.rotation.x += delta;
      this.mesh.rotation.y += delta;
    };
    time.events.on("tick", this.onTick);
  }

  destroy(): void {
    this.time.events.off("tick", this.onTick);
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    const mat = this.mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else {
      mat.dispose();
    }
  }
}
