import { Events } from "./Events";
import { Timer } from "three/addons/misc/Timer.js";

export class Time {
  private timer = new Timer();
  private frameIndex = 0;
  public elapsed = 0;
  public delta = 0;
  public events = new Events<{
    trigger: "tick";
    args: { elapsed: number; delta: number }[];
  }>();

  constructor() {
    this.tick();
  }

  private tick() {
    this.timer.update();
    this.elapsed = this.timer.getElapsed();
    this.delta = this.timer.getDelta();
    this.events.trigger("tick", { elapsed: this.elapsed, delta: this.delta });

    this.frameIndex = requestAnimationFrame(() => this.tick());
  }

  public dispose() {
    this.timer.dispose();
    this.events.clear();
    cancelAnimationFrame(this.frameIndex);
  }
}
