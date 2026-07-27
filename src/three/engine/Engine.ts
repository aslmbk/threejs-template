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
import { addRendererDebugPane } from "./debugPanel";

export type EngineOptions = {
  domElement: HTMLElement;
  config: Config;
  autoRender?: boolean;
};

/** Anything traverse() can hand back that owns disposable GPU resources. */
type Renderable = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
};

export class Engine {
  public readonly domElement: HTMLElement;
  public readonly debug: Debug | undefined;
  public readonly time: Time;
  public readonly viewport: Viewport;
  public readonly cursor: Cursor;
  public readonly inputs: Inputs;
  public readonly scene: THREE.Scene;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly controls: OrbitControls;
  public readonly rays: Rays;
  public readonly loader: Loader;
  public readonly stats: Stats | undefined;
  public readonly helpers: Helpers | undefined;

  private _camera: THREE.PerspectiveCamera;
  private _autoRender: boolean;
  private renderCallback: (() => void) | null = null;
  private destroyed = false;

  private readonly onTickControls = () => {
    this.controls.update();
  };

  private readonly onTickRender = () => {
    if (!this._autoRender) return;
    if (this.renderCallback) {
      this.renderCallback();
      return;
    }
    this.renderer.render(this.scene, this._camera);
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
    this._camera.aspect = ratio;
    this._camera.updateProjectionMatrix();
    // setPixelRatio re-applies the last setSize() with updateStyle disabled, so
    // this order leaves the canvas backing store and its CSS size consistent.
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.cursor.resize();
  };

  constructor({ domElement, config, autoRender = true }: EngineOptions) {
    this.domElement = domElement;
    this._autoRender = autoRender;

    // The renderer comes first on purpose: creating a WebGL context is the one
    // step here that realistically throws, and everything below it registers a
    // listener or mounts DOM. Built in this order a failure leaks nothing,
    // because nothing has been attached yet. Do not reorder.
    this.renderer = new THREE.WebGLRenderer({ antialias: config.antialias });
    this.renderer.toneMapping = config.toneMapping;
    this.renderer.toneMappingExposure = config.toneMappingExposure;
    this.renderer.shadowMap.enabled = config.shadows;
    this.renderer.shadowMap.type = config.shadowMapType;

    if (config.debug) {
      this.debug = new Debug(true);
      this.stats = new Stats(true);
    } else {
      this.debug = undefined;
      this.stats = undefined;
    }

    this.time = new Time({ maxDelta: config.maxDelta });
    this.viewport = new Viewport(this.domElement, {
      maxPixelRatio: config.maxDevicePixelRatio,
    });
    this.cursor = new Cursor(this.domElement);
    this.inputs = new Inputs();
    this.scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(
      config.cameraFov,
      this.viewport.ratio,
      config.cameraNear,
      config.cameraFar,
    );
    this.controls = new OrbitControls(this._camera, this.renderer.domElement);
    this.rays = new Rays(this._camera);
    this.loader = new Loader();
    this.helpers = config.debug ? new Helpers(this.scene) : undefined;

    this.scene.add(this._camera);
    this._camera.position.set(0, 0, 6);
    this.controls.enableDamping = true;
    this.domElement.appendChild(this.renderer.domElement);

    if (this.debug) {
      addRendererDebugPane(this.debug.pane, this.renderer, this.scene);
    }

    this.registerEvents();
    this.viewport.refresh();
    this.time.start();
  }

  public get camera(): THREE.PerspectiveCamera {
    return this._camera;
  }

  /**
   * Swaps the active camera and keeps everything derived from it in sync.
   * Assigning `engine.camera` is deliberately not possible — the controls, the
   * raycaster and the projection matrix would silently keep the old one.
   */
  public setCamera(camera: THREE.PerspectiveCamera) {
    if (camera === this._camera) return;

    const previous = this._camera;
    if (previous.parent === this.scene) {
      this.scene.remove(previous);
    }
    this._camera = camera;
    this.scene.add(camera);

    camera.aspect = this.viewport.ratio;
    camera.updateProjectionMatrix();

    // OrbitControls.update() re-derives the orbit from object.position on every
    // call, so the swap is picked up on its own. The quaternion mapping
    // object.up onto +Y is the exception: it is built once in the constructor
    // and there is no public way to refresh it.
    if (!camera.up.equals(previous.up)) {
      console.warn(
        "Engine.setCamera: the new camera has a different `up` vector. " +
          "OrbitControls caches it at construction, so orbiting would keep " +
          "using the previous one — build separate controls for this camera.",
      );
    }

    this.controls.object = camera;
    this.controls.update();
    this.rays.updateCamera(camera);
  }

  /** When false the tick loop renders nothing and you drive rendering yourself. */
  public get autoRender(): boolean {
    return this._autoRender;
  }

  public set autoRender(value: boolean) {
    this._autoRender = value;
  }

  /**
   * Replaces `renderer.render(scene, camera)` inside the tick loop — the hook a
   * post-processing composer plugs into, e.g.
   * `engine.setRenderCallback(() => selectiveBloom.render())`.
   * Pass null to restore the default. Ignored while `autoRender` is false.
   */
  public setRenderCallback(callback: (() => void) | null) {
    this.renderCallback = callback;
  }

  private registerEvents() {
    this.time.events.on("tick", this.onTickControls, 1);
    this.time.events.on("tick", this.onTickRender, 5);
    // Same order as the render, registered after it, so it measures the frame
    // that was just drawn.
    this.time.events.on("tick", this.onTickStats, 5);
    this.viewport.events.on("change", this.onViewportChange);
  }

  /**
   * Disposes everything the scene graph owns. Collected into sets first so a
   * geometry, material or texture shared between objects is disposed once.
   */
  private disposeScene() {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();

    const collectMaterial = (material: THREE.Material) => {
      if (materials.has(material)) return;
      materials.add(material);

      for (const key in material) {
        const value = material[key as keyof typeof material];
        if (value instanceof THREE.Texture) {
          textures.add(value);
        }
      }
    };

    this.scene.traverse((object) => {
      const renderable = object as Renderable;

      if (renderable.geometry) {
        geometries.add(renderable.geometry);
      }

      const material = renderable.material;
      if (!material) return;

      if (Array.isArray(material)) {
        for (const entry of material) {
          if (entry) collectMaterial(entry);
        }
      } else {
        collectMaterial(material);
      }
    });

    // Hang off the scene itself, so traverse() never sees them.
    if (this.scene.background instanceof THREE.Texture) {
      textures.add(this.scene.background);
    }
    if (this.scene.environment instanceof THREE.Texture) {
      textures.add(this.scene.environment);
    }

    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();

    this.scene.background = null;
    this.scene.environment = null;
    this.scene.clear();
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
    this.debug?.destroy();
    this.helpers?.destroy();
    this.controls.dispose();

    this.disposeScene();

    this.renderer.dispose();
    // dispose() frees three's caches but leaves the WebGL context alive, and
    // browsers cap how many can exist at once. This engine is torn down and
    // rebuilt on every React StrictMode cycle and every HMR reload, so the
    // context has to go back explicitly.
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
