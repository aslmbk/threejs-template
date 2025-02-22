import { Events } from "./Events";
import { Timer } from "three/addons/misc/Timer.js";

export class Time {
  private timer = new Timer();
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

    requestAnimationFrame(() => this.tick());
  }

  public dispose() {
    this.timer.dispose();
  }
}
