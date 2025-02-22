import { Events } from "./Events";
import { Timer } from "three/addons/misc/Timer.js";

export class Time {
  private elapsed = 0;
  private delta = 0;
  private timer = new Timer();
  public events = new Events();

  constructor() {
    this.tick();
  }

  private tick() {
    this.timer.update();
    this.elapsed = this.timer.getElapsed();
    this.delta = this.timer.getDelta();
    this.events.trigger("tick");

    requestAnimationFrame(() => this.tick());
  }

  public dispose() {
    this.timer.dispose();
  }
}
