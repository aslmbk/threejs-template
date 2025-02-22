import { Events } from "./Events";
import { World } from "./World";

export class Viewport {
  private world: World;
  private resizeCb = () => {};
  public width = 0;
  public height = 0;
  public ratio = 0;
  public pixelRatio = 0;
  public events = new Events<{ trigger: "change"; args: [] }>();

  constructor() {
    this.world = World.getInstance();
    this.resizeCb = (() => {
      this.measure();
      this.events.trigger("change");
    }).bind(this);
    this.resizeCb();
    window.addEventListener("resize", this.resizeCb);
  }

  private measure() {
    this.width = this.world.domElement.clientWidth;
    this.height = this.world.domElement.clientHeight;
    this.ratio = this.width / this.height;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
  }

  public dispose() {
    window.removeEventListener("resize", this.resizeCb);
    this.events.clear();
  }
}
