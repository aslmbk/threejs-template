import StatsJS from "stats.js";
import StatsGL from "stats-gl";

type StatsType = "1" | "2";

export class Stats {
  private statsJS: StatsJS;
  private statsGL: StatsGL;
  private active = false;
  private type: StatsType = "1";
  private mountedType: StatsType | null = null;

  constructor() {
    this.statsJS = new StatsJS();
    this.statsGL = new StatsGL({
      horizontal: false,
      trackCPT: true,
      trackGPU: true,
      trackHz: true,
    });

    if (this.isDebugMode) {
      this.activate();
    }
  }

  private get isDebugMode() {
    return location.hash.indexOf("debug") !== -1;
  }

  public update() {
    if (!this.active) return;
    if (this.type === "1") {
      this.statsJS.update();
    } else {
      this.statsGL.update();
    }
  }

  public activate(type: StatsType = "1") {
    this.active = true;
    this.type = type;

    if (this.mountedType && this.mountedType !== type) {
      if (this.mountedType === "1") {
        this.statsJS.dom.remove();
      } else {
        this.statsGL.dom.remove();
      }
    }

    const dom = this.type === "1" ? this.statsJS.dom : this.statsGL.dom;
    if (!dom.isConnected) {
      document.body.appendChild(dom);
    }
    this.mountedType = this.type;
  }

  public deactivate() {
    this.active = false;
    this.statsJS.dom.remove();
    this.statsGL.dom.remove();
    this.mountedType = null;
  }
}
