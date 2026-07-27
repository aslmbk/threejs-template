import * as THREE from "three/webgpu";
import type { Particle } from "./Particle";

type ParentParam = { parent: THREE.Object3D } | { scene: THREE.Object3D };

/**
 * The per-particle buffers, handed to the material factory so it can bind them
 * as instanced attributes.
 *
 * - `position` is the particle centre in local space (vec3).
 * - `data` is `(life, seed)` (vec2), where `life` is normalized to [0, 1] and
 *   `seed` is the particle's stable random value.
 */
export type ParticleAttributes = {
  position: THREE.InstancedBufferAttribute;
  data: THREE.InstancedBufferAttribute;
};

export type ParticleRendererParams = ParentParam & {
  maxParticles: number;

  /**
   * Builds the material once the buffers exist. Taking a factory rather than a
   * ready-made material is what lets the shader bind these exact attributes —
   * see `createParticleMaterial`.
   */
  material: (attributes: ParticleAttributes) => THREE.Material;

  frustumCulled?: boolean;

  disposeMaterial?: boolean;
};

type ResolvedParams = {
  parent: THREE.Object3D;
  maxParticles: number;
  frustumCulled: boolean;
  disposeMaterial: boolean;
};

/**
 * Draws a particle buffer as instanced sprites.
 *
 * Not `THREE.Points`: WebGPU only supports point primitives one pixel wide, so
 * a point size is silently ignored there. An instanced `THREE.Sprite` is the
 * supported way to get sized particles, and it behaves identically on the WebGL
 * fallback.
 */
export class ParticleRenderer {
  private readonly params: ResolvedParams;

  private readonly sprite: THREE.Sprite;
  private readonly material: THREE.Material;

  private readonly positions: Float32Array;
  private readonly data: Float32Array;

  public readonly attributes: ParticleAttributes;

  constructor(params: ParticleRendererParams) {
    this.params = {
      parent: "parent" in params ? params.parent : params.scene,
      maxParticles: params.maxParticles,
      frustumCulled: params.frustumCulled ?? false,
      disposeMaterial: params.disposeMaterial ?? false,
    };

    this.positions = new Float32Array(this.params.maxParticles * 3);
    this.data = new Float32Array(this.params.maxParticles * 2);

    // InstancedBufferAttribute keeps the array by reference, and handing the
    // attribute itself (rather than a raw array) to `instancedBufferAttribute()`
    // makes the node hold on to this exact object — so the writes below, the
    // update ranges and `needsUpdate` all reach the buffer the GPU reads. Give
    // TSL a bare Float32Array instead and it wraps a *copy* in an interleaved
    // buffer of its own. Do not "simplify" this.
    this.attributes = {
      position: new THREE.InstancedBufferAttribute(this.positions, 3),
      data: new THREE.InstancedBufferAttribute(this.data, 2),
    };
    this.attributes.position.setUsage(THREE.DynamicDrawUsage);
    this.attributes.data.setUsage(THREE.DynamicDrawUsage);

    this.material = params.material(this.attributes);

    // Sprite's typing predates node materials and still asks for a
    // SpriteMaterial. PointsNodeMaterial is the combination three documents for
    // sized particles, and it is what makes the sprite honour `sizeNode`.
    this.sprite = new THREE.Sprite(this.material as THREE.SpriteMaterial);
    // Sprite.count is the instance count of the draw call.
    this.sprite.count = 0;
    this.sprite.frustumCulled = this.params.frustumCulled;

    this.params.parent.add(this.sprite);
  }

  public get object3d(): THREE.Sprite {
    return this.sprite;
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
      this.attributes.position.clearUpdateRanges();
      this.attributes.position.addUpdateRange(0, count * 3);
      this.attributes.position.needsUpdate = true;

      this.attributes.data.clearUpdateRanges();
      this.attributes.data.addUpdateRange(0, count * 2);
      this.attributes.data.needsUpdate = true;
    }

    this.sprite.count = count;
  }

  /**
   * The sprite's quad geometry is a module-level singleton shared by every
   * sprite in three, so it is deliberately not disposed here — it is not ours.
   */
  public dispose() {
    this.params.parent.remove(this.sprite);

    if (this.params.disposeMaterial) {
      this.material.dispose();
    }
  }
}
