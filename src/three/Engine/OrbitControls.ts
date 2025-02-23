import { OrbitControls as OrbitControlsThree } from "three/addons/controls/OrbitControls.js";
import { World } from "./World";

export class OrbitControls {
  private world: World;
  private controls: OrbitControlsThree;

  constructor() {
    this.world = World.getInstance();
    this.controls = new OrbitControlsThree(
      this.world.view.camera,
      this.world.renderer.getDomElement()
    );
    this.controls.enableDamping = true;

    this.world.time.events.on("tick", () => {
      this.update();
    });
  }

  public update() {
    this.controls.update();
  }
}
