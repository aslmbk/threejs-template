import { Events } from "./Events";
import { World } from "./World";

export class Viewport {
  private world: World;
  public width = 0;
  public height = 0;
  public ratio = 0;
  public pixelRatio = 0;
  public events = new Events<{ trigger: "change"; args: [] }>();

  constructor() {
    this.world = World.getInstance();
    this.measure();
    window.addEventListener("resize", () => {
      this.measure();
      this.events.trigger("change");
    });
  }

  private measure() {
    this.width = this.world.domElement.clientWidth;
    this.height = this.world.domElement.clientHeight;
    this.ratio = this.width / this.height;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
  }

  public dispose() {}
}
