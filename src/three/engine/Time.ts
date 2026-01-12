import { Events } from "../lib";
import * as THREE from "three";

export type TimeEventArgs = {
  delta: number;
  elapsed: number;
};

export class Time extends THREE.Timer {
  public readonly events = new Events<{
    tick: TimeEventArgs;
  }>();

  private running: boolean = false;
  private animationFrameId: number | null = null;

  constructor() {
    super();
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.reset();
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  public stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick() {
    if (!this.running) return;

    this.update();
    this.events.trigger("tick", {
      elapsed: this.getElapsed(),
      delta: this.getDelta(),
    });

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  public destroy() {
    this.stop();
    this.events.off("tick");
  }
}
