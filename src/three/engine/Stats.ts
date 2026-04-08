import StatsJS from "stats.js";
import StatsGL from "stats-gl";

type StatsType = "js" | "gl";

export class Stats {
  private statsJS: StatsJS | null = null;
  private statsGL: StatsGL | null = null;
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
    this.statsGL ??= new StatsGL({
      horizontal: false,
      trackCPT: true,
      trackGPU: true,
      trackHz: true,
    });
    return this.statsGL;
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
  }
}
