import * as THREE from "three/webgpu";
import { Events } from "../lib";

export type TimeEventArgs = {
  delta: number;
  elapsed: number;
};

export type TimeOptions = {
  /**
   * Upper bound in seconds (at timescale 1) for the delta reported by `tick`.
   * Protects delta-integrating code from the spikes produced by blocking work
   * such as asset decoding, a long GC pause or a paused debugger.
   */
  maxDelta?: number;
};

export class Time extends THREE.Timer {
  public readonly events = new Events<{
    tick: TimeEventArgs;
  }>();

  private readonly maxDelta: number;
  private elapsed = 0;
  private running = false;

  constructor(options: TimeOptions = {}) {
    super();
    this.maxDelta = options.maxDelta ?? 0.1;

    // Without connect() the Page Visibility guard inside Timer.update() stays
    // disabled: rAF is parked while the tab is hidden, so the first frame after
    // it regains focus would report the entire hidden period as one delta.
    this.connect(document);
  }

  /**
   * Integral of the deltas emitted by `tick`. THREE.Timer accumulates the raw
   * delta instead, so this is overridden to keep `elapsed` and `delta`
   * describing the same timeline once clamping kicks in.
   */
  public override getElapsed() {
    return this.elapsed;
  }

  /** Arms the clock. Call it right before the animation loop is wired up. */
  public start() {
    if (this.running) return;
    this.running = true;
    this.reset();
  }

  public stop() {
    this.running = false;
  }

  /**
   * Advances one frame. Public because `Engine` drives it from the renderer's
   * own animation loop rather than scheduling a second requestAnimationFrame:
   * that loop already runs unconditionally once the backend is initialized, and
   * calling from inside it puts the tick after `nodeFrame.update()` (which
   * advances TSL's `time` / `deltaTime` nodes) and after `info.reset()`.
   */
  public tick() {
    if (!this.running) return;

    this.update();

    // Timer applies the timescale before we see the delta, so the bound has to
    // follow it — otherwise setTimescale(10) would clamp every frame and end up
    // running in slow motion. Symmetric, so a negative timescale stays bounded.
    const limit = this.maxDelta * Math.abs(this.getTimescale());
    const delta = THREE.MathUtils.clamp(this.getDelta(), -limit, limit);

    this.elapsed += delta;
    this.events.trigger("tick", { elapsed: this.elapsed, delta });
  }

  public destroy() {
    this.stop();
    // Timer.dispose() detaches the visibilitychange listener added by connect().
    this.dispose();
    this.events.off("tick");
  }
}
