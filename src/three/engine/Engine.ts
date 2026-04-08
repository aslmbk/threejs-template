import * as THREE from "three";
import type { Config } from "../Config";
import { Debug } from "./Debug";
import { Time } from "./Time";
import { Viewport, type ViewportEventArgs } from "./Viewport";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Loader } from "./Loader";
import { Stats } from "./Stats";
import { Helpers } from "./Helpers";
import { Cursor } from "./Cursor";
import { Inputs } from "./Inputs";
import { Rays } from "./Rays";

export type EngineOptions = {
  domElement: HTMLElement;
  config: Config;
  autoRender?: boolean;
};

export class Engine {
  public readonly domElement: HTMLElement;
  public readonly debug: Debug | undefined;
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
  public readonly stats: Stats | undefined;
  public readonly helpers: Helpers | undefined;

  private autoRender: boolean;
  private destroyed = false;

  private readonly onTickControls = () => {
    this.controls.update();
  };

  private readonly onTickRender = () => {
    if (this.autoRender) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private readonly onTickStats = () => {
    this.stats?.update();
  };

  private readonly onViewportChange = ({
    width,
    height,
    ratio,
    pixelRatio,
  }: ViewportEventArgs) => {
    this.camera.aspect = ratio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.cursor.resize();
  };

  constructor({ domElement, config, autoRender = true }: EngineOptions) {
    this.domElement = domElement;
    this.autoRender = autoRender;

    if (config.debug) {
      this.debug = new Debug(true);
      this.stats = new Stats(true);
    } else {
      this.debug = undefined;
      this.stats = undefined;
    }

    this.time = new Time();
    this.viewport = new Viewport(this.domElement, {
      maxPixelRatio: config.maxDevicePixelRatio,
    });
    this.cursor = new Cursor(this.domElement);
    this.inputs = new Inputs();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      config.cameraFov,
      this.viewport.ratio,
      config.cameraNear,
      config.cameraFar,
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: config.antialias });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.rays = new Rays(this.camera);
    this.loader = new Loader();
    this.helpers = config.debug ? new Helpers(this.scene) : undefined;

    this.scene.add(this.camera);
    this.camera.position.set(0, 0, 6);
    this.controls.enableDamping = true;
    this.domElement.appendChild(this.renderer.domElement);

    this.registerEvents();
    this.viewport.refresh();
    this.time.start();
  }

  private registerEvents() {
    this.time.events.on("tick", this.onTickControls, 1);
    this.time.events.on("tick", this.onTickRender, 5);
    this.time.events.on("tick", this.onTickStats, 5);
    this.viewport.events.on("change", this.onViewportChange);
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
    this.rays.destroy();
    this.stats?.destroy();
    this.debug?.dispose();
    this.helpers?.destroy();
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

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
