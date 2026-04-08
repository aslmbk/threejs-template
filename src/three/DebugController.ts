import type { Config } from "./Config";
import type { Engine } from "./engine/Engine";

export class DebugController {
  private readonly config: Config;
  private readonly engine: Engine;

  constructor(config: Config, engine: Engine) {
    this.config = config;
    this.engine = engine;

    if (!config.debug) return;
    this.engine.helpers?.addAxesHelper();
    this.engine.helpers?.addGridHelper();
  }

  destroy(): void {
    if (!this.config.debug) return;
    this.engine.stats?.destroy();
    this.engine.debug?.deactivate();
    this.engine.debug?.dispose();
  }
}
