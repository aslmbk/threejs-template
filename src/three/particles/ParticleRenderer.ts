import * as THREE from "three";
import { Particle } from "./Particle";

export type ParticleRendererParams = {
  maxParticles: number;
  material: THREE.ShaderMaterial;
  scene: THREE.Object3D;
  frustumCulled: boolean;
};

export class ParticleRenderer {
  private readonly params: ParticleRendererParams;
  private readonly geometry = new THREE.BufferGeometry();
  private particles!: THREE.Points;

  constructor(params: ParticleRendererParams) {
    this.params = params;

    const positions = new Float32Array(this.params.maxParticles * 3);
    const data = new Float32Array(this.params.maxParticles * 2);

    this.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute(
      "data",
      new THREE.Float32BufferAttribute(data, 2)
    );

    (this.geometry.attributes.position as THREE.BufferAttribute).setUsage(
      THREE.DynamicDrawUsage
    );
    (this.geometry.attributes.data as THREE.BufferAttribute).setUsage(
      THREE.DynamicDrawUsage
    );

    this.particles = new THREE.Points(this.geometry, this.params.material);
    // The frustum culling depends on the bounding box/sphere of the particles (i.e the geometry)
    this.particles.frustumCulled = this.params.frustumCulled;
    this.params.scene.add(this.particles);
  }

  public updateFromParticles(particles: Particle[]) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      this.geometry.attributes.position.setXYZ(
        i,
        p.position.x,
        p.position.y,
        p.position.z
      );
      this.geometry.attributes.data.setXY(i, p.life / p.maxLife, p.id);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.data.needsUpdate = true;

    this.geometry.setDrawRange(0, particles.length);
  }

  public dispose() {
    this.params.scene.remove(this.particles);
    this.geometry.dispose();
    this.params.material.dispose();
    this.params.material.userData.isDisposed = true;
  }
}
