import StatsJS from "stats.js";
import StatsGL from "stats-gl";
import type * as THREE from "three/webgpu";

type StatsType = "js" | "gl";

export class Stats {
  private statsJS: StatsJS | null = null;
  private statsGL: StatsGL | null = null;
  private renderer: THREE.WebGPURenderer | null = null;
  private active = false;
  private type: StatsType = "js";
  private disposed = false;

  constructor(debugEnabled: boolean) {
    if (debugEnabled) {
      this.activate();
    }
  }

  private ensureStatsJS() {
    this.statsJS ??= new StatsJS();
    return this.statsJS;
  }

  private ensureStatsGL() {
    if (!this.statsGL) {
      this.statsGL = new StatsGL({
        horizontal: false,
        trackCPT: true,
        trackGPU: true,
        trackHz: true,
      });
      this.initStatsGL();
    }
    return this.statsGL;
  }

  /**
   * stats-gl needs the renderer itself, not just a canvas: it reads
   * `renderer.info` and flips `backend.trackTimestamp` on to get GPU timings out
   * of WebGPU. Skipping this leaves the GPU and CPT panels pinned at zero.
   */
  private initStatsGL() {
    const { statsGL, renderer } = this;
    if (!statsGL || !renderer) return;

    void statsGL.init(renderer).catch((error: unknown) => {
      console.warn("Stats: GPU tracking unavailable.", error);
    });
  }

  /**
   * Connects the panels to a renderer. Call it once the backend is initialized
   * — `Engine` does this from `ready`. Safe to call before the GL panel exists;
   * the renderer is remembered and used when it is created.
   */
  public attach(renderer: THREE.WebGPURenderer) {
    if (this.disposed) return;
    this.renderer = renderer;
    this.initStatsGL();
  }

  public update() {
    if (this.disposed || !this.active) return;
    if (this.type === "js") {
      this.ensureStatsJS().update();
    } else {
      this.ensureStatsGL().update();
    }
  }

  public activate(type: StatsType = this.type) {
    this.active = true;
    this.type = type;

    if (type === "js") {
      this.statsGL?.dom.remove();
    } else {
      this.statsJS?.dom.remove();
    }

    const dom =
      type === "js" ? this.ensureStatsJS().dom : this.ensureStatsGL().dom;
    if (!dom.isConnected) {
      document.body.appendChild(dom);
    }
  }

  public deactivate() {
    this.active = false;
    this.statsJS?.dom.remove();
    this.statsGL?.dom.remove();
  }

  public destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.deactivate();
    this.statsJS = null;
    this.statsGL = null;
    this.renderer = null;
  }
}
