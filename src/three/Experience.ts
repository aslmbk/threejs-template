import { Engine } from "./Engine";
import { DebugController } from "./DebugController";
import { Particles } from "./Particles";
import { Config } from "./Config";
import { GPUComputation } from "./GPUComputation";

export class Experience extends Engine {
  public readonly config: Config;
  public readonly particles: Particles;
  public readonly debugController: DebugController;
  public readonly gpuComputation: GPUComputation;

  constructor(domElement: HTMLElement) {
    super({ domElement });
    this.config = new Config();
    this.debugController = new DebugController(this);

    this.particles = new Particles();
    this.particles.changeParticlesSize(this.config.uSize);
    this.scene.add(this.particles.points);

    this.gpuComputation = new GPUComputation(
      this.renderer,
      this.particles.textureSize
    );
    this.gpuComputation.setTextureDataFromAttribute(
      this.particles.positionsAttribute
    );
    this.gpuComputation.init();
    this.scene.add(this.gpuComputation.getDebugPlane());

    this.viewport.events.on("change", () => {
      this.particles.onResize(
        this.viewport.width,
        this.viewport.height,
        this.viewport.pixelRatio
      );
    });
    this.time.events.on(
      "tick",
      () => {
        this.gpuComputation.update();
        this.particles.changeParticlesTexture(
          this.gpuComputation.getCRTTexture()
        );
      },
      4
    );
  }

  public dispose() {
    this.scene.dispose();
    this.gpuComputation.dispose();
  }
}
