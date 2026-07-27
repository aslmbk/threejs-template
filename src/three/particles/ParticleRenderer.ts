import * as THREE from "three";
import type { Particle } from "./Particle";

type ParentParam = { parent: THREE.Object3D } | { scene: THREE.Object3D };

export type ParticleRendererParams = ParentParam & {
  maxParticles: number;
  material: THREE.Material;

  frustumCulled?: boolean;

  disposeMaterial?: boolean;
};

type ResolvedParams = {
  parent: THREE.Object3D;
  maxParticles: number;
  material: THREE.Material;
  frustumCulled: boolean;
  disposeMaterial: boolean;
};

export class ParticleRenderer {
  private readonly params: ResolvedParams;

  private readonly geometry = new THREE.BufferGeometry();
  private readonly points: THREE.Points;

  private readonly positions: Float32Array;
  private readonly data: Float32Array;

  private readonly positionAttribute: THREE.BufferAttribute;
  private readonly dataAttribute: THREE.BufferAttribute;

  constructor(params: ParticleRendererParams) {
    this.params = {
      parent: "parent" in params ? params.parent : params.scene,
      maxParticles: params.maxParticles,
      material: params.material,
      frustumCulled: params.frustumCulled ?? false,
      disposeMaterial: params.disposeMaterial ?? false,
    };

    this.positions = new Float32Array(this.params.maxParticles * 3);
    this.data = new Float32Array(this.params.maxParticles * 2);

    // BufferAttribute keeps the array by reference. Float32BufferAttribute does
    // `new Float32Array(array)` instead, i.e. it COPIES — every write below
    // would land in a buffer the GPU never sees. Do not "simplify" this back.
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);

    this.dataAttribute = new THREE.BufferAttribute(this.data, 2);
    this.dataAttribute.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("data", this.dataAttribute);
    this.geometry.setDrawRange(0, 0);

    this.points = new THREE.Points(this.geometry, this.params.material);
    this.points.frustumCulled = this.params.frustumCulled;
    this.params.parent.add(this.points);
  }

  public get object3d(): THREE.Points {
    return this.points;
  }

  public updateFromParticles(particles: ReadonlyArray<Particle>) {
    const count = Math.min(particles.length, this.params.maxParticles);

    for (let i = 0; i < count; i++) {
      const p = particles[i];

      const i3 = i * 3;
      this.positions[i3 + 0] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;

      const i2 = i * 2;
      this.data[i2 + 0] = p.maxLife > 0 ? p.life / p.maxLife : 1;
      this.data[i2 + 1] = p.seed;
    }

    if (count > 0) {
      // Upload only the live prefix rather than the whole buffer. Ranges are
      // measured in array elements, and three clears them after each upload.
      this.positionAttribute.clearUpdateRanges();
      this.positionAttribute.addUpdateRange(0, count * 3);
      this.positionAttribute.needsUpdate = true;

      this.dataAttribute.clearUpdateRanges();
      this.dataAttribute.addUpdateRange(0, count * 2);
      this.dataAttribute.needsUpdate = true;
    }

    this.geometry.setDrawRange(0, count);
  }

  public dispose() {
    this.params.parent.remove(this.points);
    this.geometry.dispose();

    if (this.params.disposeMaterial) {
      this.params.material.dispose();
    }
  }
}
