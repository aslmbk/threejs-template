import * as THREE from "three";
import { Debug } from "./Debug";
import { Time } from "./Time";
import { Viewport } from "./Viewport";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Loader } from "./Loader";
import { Stats } from "./Stats";
import { Helpers } from "./Helpers";
import { Cursor } from "./Cursor";
import { Inputs } from "./Inputs";
import { Rays } from "./Rays";

const ENGINE_SINGLETON_STORE_KEY = "__threejsTemplateEngineSingletonStore__";

type SingletonStore = Map<string, Engine>;

const singletonStore: SingletonStore =
  (import.meta.hot?.data?.[ENGINE_SINGLETON_STORE_KEY] as
    | SingletonStore
    | undefined) ?? new Map<string, Engine>();

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    data[ENGINE_SINGLETON_STORE_KEY] = singletonStore;
  });
}

export type EngineOptions = {
  domElement: HTMLElement;
  autoRender?: boolean;
};

export class Engine {
  public static getInstance<T extends typeof Engine>(
    this: T,
    domElement?: HTMLElement,
    options?: Omit<EngineOptions, "domElement">
  ): InstanceType<T> {
    const key = this.name;
    const existing = singletonStore.get(key) as InstanceType<T> | undefined;

    if (existing) {
      if (Object.getPrototypeOf(existing) !== this.prototype) {
        Object.setPrototypeOf(existing, this.prototype);
      }

      if (domElement && domElement !== existing.domElement) {
        throw new Error(
          `${this.name} already initialized with a different domElement`
        );
      }
      return existing;
    }

    if (!domElement) {
      throw new Error(
        `${this.name} is not initialized yet. Pass domElement on the first call.`
      );
    }

    const instance = new this({
      domElement,
      ...(options ?? {}),
    }) as InstanceType<T>;

    singletonStore.set(key, instance);
    return instance;
  }

  public static isInitialized<T extends typeof Engine>(this: T): boolean {
    return singletonStore.has(this.name);
  }

  public static rebindSingletonPrototype<T extends typeof Engine>(
    this: T
  ): void {
    const existing = singletonStore.get(this.name);
    if (!existing) return;
    if (Object.getPrototypeOf(existing) !== this.prototype) {
      Object.setPrototypeOf(existing, this.prototype);
    }
  }

  public readonly domElement: HTMLElement;
  public readonly debug: Debug;
  public readonly time: Time;
  public readonly viewport: Viewport;
  public readonly cursor: Cursor;
  public readonly inputs: Inputs;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;
  public readonly rays: Rays;
  public readonly loader: Loader;
  public readonly stats: Stats;
  public readonly helpers: Helpers;

  private autoRender: boolean;
  private destroyed = false;

  constructor({ domElement, autoRender = true }: EngineOptions) {
    this.domElement = domElement;
    this.autoRender = autoRender;

    this.debug = new Debug();
    this.time = new Time();
    this.viewport = new Viewport(this.domElement);
    this.cursor = new Cursor(
      this.domElement,
      this.viewport.width,
      this.viewport.height
    );
    this.inputs = new Inputs();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.viewport.ratio,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.rays = new Rays(this.camera);
    this.loader = new Loader(this.scene);
    this.stats = new Stats();
    this.helpers = new Helpers(this.scene);

    this.scene.add(this.camera);
    this.camera.position.set(0, 0, 6);
    this.controls.enableDamping = true;
    this.domElement.appendChild(this.renderer.domElement);

    this.registerEvents();
    this.viewport.refresh();
    this.time.start();
  }

  private registerEvents() {
    this.time.events.on(
      "tick",
      () => {
        if (this.autoRender) {
          this.renderer.render(this.scene, this.camera);
        }
      },
      5
    );
    this.time.events.on("tick", () => {
      this.controls.update();
      this.stats.update();
    });
    this.viewport.events.on(
      "change",
      ({ width, height, ratio, pixelRatio }) => {
        this.camera.aspect = ratio;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(pixelRatio);
        this.cursor.resize(width, height);
      }
    );
  }

  private disposeMaterial(material: THREE.Material) {
    for (const key in material) {
      const value = material[key as keyof typeof material];
      if (value && value instanceof THREE.Texture) {
        value.dispose();
      }
    }
    material.dispose();
  }

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.time.destroy();
    this.viewport.destroy();
    this.cursor.destroy();
    this.inputs.destroy();
    this.loader.destroy();
    this.stats.deactivate();
    this.debug.deactivate();
    this.debug.dispose();
    this.controls.dispose();

    this.scene.traverse((object) => {
      const anyObject = object as unknown as {
        geometry?: { dispose?: () => void };
        material?: THREE.Material | THREE.Material[];
      };

      anyObject.geometry?.dispose?.();

      const material = anyObject.material;
      if (!material) return;

      if (Array.isArray(material)) {
        material.forEach((m) => {
          if (!m) return;
          this.disposeMaterial(m);
        });
      } else {
        this.disposeMaterial(material);
      }
    });

    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.renderer.domElement.remove();

    const key = (this.constructor as typeof Engine).name;
    const entry = singletonStore.get(key);
    if (entry === this) {
      singletonStore.delete(key);
    }
  }
}
