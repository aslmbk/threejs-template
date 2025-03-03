import * as THREE from "three";
import {
  GPUComputationRenderer,
  Variable,
} from "three/addons/misc/GPUComputationRenderer.js";
import computeShader from "../shaders/gpgpu/compute.glsl";

export class GPUComputation {
  private computationRenderer: GPUComputationRenderer;
  private baseTexture: THREE.Texture;
  private variable: Variable;
  private debugPlane: THREE.Mesh | null = null;

  constructor(renderer: THREE.WebGLRenderer, size: number) {
    this.computationRenderer = new GPUComputationRenderer(size, size, renderer);
    this.baseTexture = this.computationRenderer.createTexture();
    this.variable = this.computationRenderer.addVariable(
      "uPositionsTexture",
      computeShader,
      this.baseTexture
    );
    this.computationRenderer.setVariableDependencies(this.variable, [
      this.variable,
    ]);
  }

  public setTextureDataFromAttribute(
    attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
  ) {
    for (let i = 0; i < attribute.count; i++) {
      const ix = i * attribute.itemSize;
      const i4 = i * 4;
      for (let j = 0; j < 4; j++) {
        this.baseTexture.image.data[i4 + j] =
          j < attribute.itemSize ? attribute.array[ix + j] : 0;
      }
    }
    this.baseTexture.needsUpdate = true;
  }

  public getCRTTexture() {
    return this.computationRenderer.getCurrentRenderTarget(this.variable)
      .texture;
  }

  public init() {
    this.computationRenderer.init();
  }

  public getDebugPlane() {
    const geometry = new THREE.PlaneGeometry(3, 3);
    const material = new THREE.MeshBasicMaterial({
      map: this.getCRTTexture(),
    });
    this.debugPlane = new THREE.Mesh(geometry, material);
    return this.debugPlane;
  }

  public update() {
    this.computationRenderer.compute();
    if (this.debugPlane) {
      (this.debugPlane.material as THREE.MeshBasicMaterial).map =
        this.getCRTTexture();
    }
  }

  public dispose() {
    this.computationRenderer.dispose();
  }
}
