import * as THREE from "three";
import vertexShader from "../shaders/particles/vertex.glsl";
import fragmentShader from "../shaders/particles/fragment.glsl";

export class Particles {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  public readonly points: THREE.Points;
  public readonly positionsAttribute: THREE.BufferAttribute;
  public readonly textureSize: number;

  constructor() {
    const geometry = new THREE.SphereGeometry(3);
    this.positionsAttribute = geometry.attributes
      .position as THREE.BufferAttribute;
    this.textureSize = Math.ceil(Math.sqrt(this.positionsAttribute.count));

    const uvArray = new Float32Array(this.positionsAttribute.count * 2);
    for (let y = 0; y < this.textureSize; y++) {
      for (let x = 0; x < this.textureSize; x++) {
        const i = y * this.textureSize + x;
        const i2 = i * 2;
        const uvX = (x + 0.5) / this.textureSize;
        const uvY = (y + 0.5) / this.textureSize;
        uvArray[i2 + 0] = uvX;
        uvArray[i2 + 1] = uvY;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setDrawRange(0, this.positionsAttribute.count);
    this.geometry.setAttribute("aUv", new THREE.BufferAttribute(uvArray, 2));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uSize: new THREE.Uniform(0.1),
        uResolution: new THREE.Uniform(new THREE.Vector2(1, 1)),
        uPositionsTexture: new THREE.Uniform(null),
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  public onResize(width: number, height: number, pixelRatio: number) {
    this.material.uniforms.uResolution.value.set(
      width * pixelRatio,
      height * pixelRatio
    );
  }

  public changeParticlesSize(size: number) {
    this.material.uniforms.uSize.value = size;
  }

  public changeParticlesTexture(texture: THREE.Texture) {
    this.material.uniforms.uPositionsTexture.value = texture;
  }
}
