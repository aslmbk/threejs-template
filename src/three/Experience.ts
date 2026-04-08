import { Engine } from "./engine/Engine";
import { Config } from "./Config";
import { DemoScene } from "./world/DemoScene";
import type { SceneModule } from "./world/SceneModule";

const SINGLETON_KEY = "__experienceSingleton__";

let instance: Experience | null =
  (import.meta.hot?.data?.[SINGLETON_KEY] as Experience | null | undefined) ??
  null;

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    data[SINGLETON_KEY] = instance;
  });
}

export class Experience {
  public readonly engine: Engine;
  public readonly config: Config;
  private readonly modules: SceneModule[] = [];

  static getInstance(domElement?: HTMLElement): Experience {
    if (instance) {
      if (domElement && domElement !== instance.engine.domElement) {
        throw new Error(
          "Experience already initialized with a different domElement"
        );
      }
      return instance;
    }

    if (!domElement) {
      throw new Error(
        "Experience is not initialized yet. Pass domElement on the first call."
      );
    }

    instance = new Experience(domElement);
    return instance;
  }

  static isInitialized(): boolean {
    return instance !== null;
  }

  static rebindSingletonPrototype(): void {
    if (!instance) return;
    Object.setPrototypeOf(instance, Experience.prototype);
    Object.setPrototypeOf(instance.engine, Engine.prototype);
  }

  private constructor(domElement: HTMLElement) {
    this.config = new Config();
    this.engine = new Engine({ domElement, config: this.config });

    if (this.config.debug) {
      this.engine.helpers?.addAxesHelper();
      this.engine.helpers?.addGridHelper();
    }

    this.modules.push(new DemoScene(this.engine.scene, this.engine.time));
  }

  destroy(): void {
    for (const m of this.modules) {
      m.destroy();
    }
    this.modules.length = 0;
    this.engine.destroy();
    instance = null;
  }
}

if (import.meta.hot) {
  Experience.rebindSingletonPrototype();
}
