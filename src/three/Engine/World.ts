import { Debug } from "./Debug";
import { Time } from "./Time";
import { Viewport } from "./Viewport";
import { Scene } from "./Scene";
import { View } from "./View";
import { Renderer } from "./Renderer";
import { OrbitControls } from "./OrbitControls";

export type WorldOptions = {
  domElement: HTMLElement;
  autoRender?: boolean;
};

export class World {
  private static instance: World;
  public domElement!: HTMLElement;
  public debug!: Debug;
  public time!: Time;
  public viewport!: Viewport;
  public scene!: Scene;
  public view!: View;
  public renderer!: Renderer;
  public controls!: OrbitControls;

  constructor({ domElement, autoRender = true }: WorldOptions) {
    if (World.instance) return World.instance;
    World.instance = this;

    this.domElement = domElement;

    this.debug = new Debug();
    this.time = new Time();
    this.viewport = new Viewport();
    this.scene = new Scene();
    this.view = new View();
    this.renderer = new Renderer(autoRender);
    this.controls = new OrbitControls();
  }

  public static getInstance(): World {
    if (!World.instance) {
      throw new Error("World instance not initialized");
    }
    return World.instance;
  }

  public dispose() {
    this.debug.dispose();
    this.time.dispose();
    this.viewport.dispose();
    this.scene.dispose();
    this.view.dispose();
    this.renderer.dispose();
  }
}
