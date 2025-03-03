import { Engine } from "./Engine";
import { DebugController } from "./DebugController";
import { Particles } from "./Particles";
import { Config } from "./Config";
import { GPUComputation } from "./GPUComputation";

export class Experience extends Engine {
  public config: Config;
  public particles: Particles;
  public debugController: DebugController;
  public gpuComputation: GPUComputation;

  constructor(domElement: HTMLElement) {
    super({ domElement });
    this.config = new Config();
    this.debugController = new DebugController(this);

    this.particles = new Particles();
    this.particles.material.uniforms.uSize.value = this.config.uSize;
    this.scene.add(this.particles.points);

    const particlesCount = this.particles.geometry.attributes.position.count;

    this.gpuComputation = new GPUComputation(
      this.renderer,
      Math.ceil(Math.sqrt(particlesCount))
    );
    this.gpuComputation.setTextureDataFromAttribute(
      this.particles.geometry.attributes.position
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
      },
      4
    );
  }

  public dispose() {
    this.scene.dispose();
    this.gpuComputation.dispose();
  }
}
