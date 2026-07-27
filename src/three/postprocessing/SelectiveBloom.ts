import * as THREE from "three/webgpu";
import { emissive, mrt, output, pass } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

export type SelectiveBloomOptions = {
  /** Bloom intensity. */
  strength?: number;
  /** Blur spread, in the range [0, 1]. */
  radius?: number;
  /** Luminance below which a pixel does not bloom at all. */
  threshold?: number;
};

/**
 * Bloom restricted to the emissive part of the scene.
 *
 * The scene is rendered **once**, into two attachments: the finished colour and
 * the raw emissive contribution (MRT). Bloom then runs on the emissive
 * attachment alone and is added back on top. That is what makes it selective —
 * there is no layer bookkeeping and no swapping stand-in materials in and out
 * between two full renders, which is how the same effect had to be built on the
 * WebGL renderer.
 *
 * To make an object bloom, give its material an emissive contribution:
 *
 * ```ts
 * const material = new THREE.MeshStandardNodeMaterial({ color: 0x000000 });
 * material.emissive = new THREE.Color(0x00aaff);
 * material.emissiveIntensity = 4;
 * // or, for full control: material.emissiveNode = vec3(0, 2, 4);
 * ```
 *
 * A material with no emissive term contributes nothing and stays sharp, so
 * whether something glows is a property of the material rather than of the
 * object — an instance of a shared material cannot bloom on its own.
 *
 * Wiring is the caller's job, the same as before, but resizing no longer is:
 *
 * ```ts
 * engine.setRenderCallback(() => selectiveBloom.render());
 * // and selectiveBloom.dispose() from your module's destroy()
 * ```
 */
export class SelectiveBloom {
  public readonly scenePass: ReturnType<typeof pass>;
  public readonly bloomNode: ReturnType<typeof bloom>;
  public readonly pipeline: THREE.RenderPipeline;

  constructor(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: SelectiveBloomOptions = {},
  ) {
    const { strength = 1, radius = 0.5, threshold = 0 } = options;

    this.scenePass = pass(scene, camera);
    // Two attachments off one render: `output` is the shaded result, `emissive`
    // is the emissive term on its own. Only the latter feeds the bloom.
    this.scenePass.setMRT(mrt({ output, emissive }));

    this.bloomNode = bloom(
      this.scenePass.getTextureNode("emissive"),
      strength,
      radius,
      threshold,
    );

    this.pipeline = new THREE.RenderPipeline(renderer);
    this.pipeline.outputNode = this.scenePass
      .getTextureNode("output")
      .add(this.bloomNode);
  }

  /** Bloom intensity. Backed by a uniform, so changing it recompiles nothing. */
  public get strength(): number {
    return this.bloomNode.strength.value;
  }

  public set strength(value: number) {
    this.bloomNode.strength.value = value;
  }

  /** Blur spread, in the range [0, 1]. */
  public get radius(): number {
    return this.bloomNode.radius.value;
  }

  public set radius(value: number) {
    this.bloomNode.radius.value = value;
  }

  /** Luminance below which a pixel does not bloom at all. */
  public get threshold(): number {
    return this.bloomNode.threshold.value;
  }

  public set threshold(value: number) {
    this.bloomNode.threshold.value = value;
  }

  /**
   * Safe to call from the tick loop: `Engine` only starts that loop once the
   * backend is up, and there is no async variant to reach for — three
   * deprecated `renderAsync()` in favour of awaiting `renderer.init()`, which
   * `engine.ready` already does.
   */
  public render(): void {
    this.pipeline.render();
  }

  /**
   * Releases every render target this owns. `RenderPipeline.dispose()` only
   * frees its own output quad material — the pass keeps the MRT target and the
   * bloom node keeps its blur chain, so all three have to be released. This is
   * the same "the pipeline does not own its passes" rule the old composer had.
   */
  public dispose(): void {
    this.pipeline.dispose();
    this.scenePass.dispose();
    this.bloomNode.dispose();
  }
}
