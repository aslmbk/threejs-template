import StatsJS from "stats.js";
import StatsGL from "stats-gl";
import { Engine } from "./Engine";

export type StatsType = "1" | "2";

export class Stats {
  private statsJS: StatsJS;
  private statsGL: StatsGL;
  private active = true;
  private type: StatsType;
  private engine: Engine;

  constructor(type: StatsType = "1") {
    this.type = type;
    this.engine = Engine.getInstance();
    this.statsJS = new StatsJS();
    this.statsGL = new StatsGL({
      horizontal: false,
      trackCPT: true,
      trackGPU: true,
      trackHz: true,
    });

    this.engine.time.events.on("tick", () => {
      if (this.active) {
        if (this.type === "1") {
          this.statsJS.update();
        } else {
          this.statsGL.update();
        }
      }
    });
  }

  public activate() {
    if (location.hash.indexOf("debug") === -1) return;
    this.active = true;
    if (this.type === "1") {
      document.body.appendChild(this.statsJS.dom);
    } else {
      document.body.appendChild(this.statsGL.dom);
    }
  }

  public deactivate() {
    this.active = false;
    if (this.type === "1") {
      document.body.removeChild(this.statsJS.dom);
    } else {
      document.body.removeChild(this.statsGL.dom);
    }
  }
}
