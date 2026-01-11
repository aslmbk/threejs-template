import * as THREE from "three";

import { MATH } from "../lib";
import { Attractor } from "./Attractor";
import type { EmitterShape } from "./EmitterShape";
import { PointShape } from "./EmitterShape";
import { Particle } from "./Particle";
import type { ParticleCallback, RandomFn, Time } from "./types";

export type EmitterParams = {
  maxLife: number;

  velocityMagnitude: number;
  velocityMagnitudeVariance: number;

  rotation: THREE.Quaternion;
  rotationAngularVariance: number;

  gravity: THREE.Vector3;
  gravityStrength: number;
  dragCoefficient: number;

  maxParticles: number;
  emissionRate: number;
  maxEmission: number;

  shape?: EmitterShape;

  attractors?: readonly Attractor[];

  random?: RandomFn;

  onCreateParticle?: ParticleCallback;
  onUpdateParticle?: ParticleCallback;
  onRemoveParticle?: ParticleCallback;
};

const EPSILON = 1e-6;

export class Emitter {
  private readonly maxLife: number;

  private readonly velocityMagnitude: number;
  private readonly velocityMagnitudeVariance: number;

  private readonly rotation: THREE.Quaternion;
  private readonly rotationAngularVariance: number;

  private readonly gravity: THREE.Vector3;
  private readonly gravityStrength: number;
  private readonly dragCoefficient: number;

  private readonly maxParticles: number;
  private readonly emissionRate: number;
  private readonly maxEmission: number;

  private readonly shape: EmitterShape;
  private readonly attractors: readonly Attractor[];
  private readonly random: RandomFn;

  private readonly onCreateParticle?: ParticleCallback;
  private readonly onUpdateParticle?: ParticleCallback;
  private readonly onRemoveParticle?: ParticleCallback;

  private readonly _particles: Particle[] = [];
  private readonly pool: Particle[] = [];

  private emissionTime = 0;
  private emittedCount = 0;
  private emissionEnabled = true;

  private readonly tmpForces = new THREE.Vector3();
  private readonly tmpDirection = new THREE.Vector3();

  constructor(params: EmitterParams) {
    this.maxLife = params.maxLife;

    this.velocityMagnitude = params.velocityMagnitude;
    this.velocityMagnitudeVariance = params.velocityMagnitudeVariance;

    this.rotation = params.rotation;
    this.rotationAngularVariance = params.rotationAngularVariance;

    this.gravity = params.gravity;
    this.gravityStrength = params.gravityStrength;
    this.dragCoefficient = params.dragCoefficient;

    this.maxParticles = params.maxParticles;
    this.emissionRate = params.emissionRate;
    this.maxEmission = params.maxEmission;

    this.shape = params.shape ?? new PointShape();
    this.attractors = params.attractors ?? [];

    this.random = params.random ?? MATH.random;

    this.onCreateParticle = params.onCreateParticle;
    this.onUpdateParticle = params.onUpdateParticle;
    this.onRemoveParticle = params.onRemoveParticle;
  }

  public get isActive() {
    const canStillEmit =
      this.emissionEnabled && this.emittedCount < this.maxEmission;
    return canStillEmit || this._particles.length > 0;
  }

  public get particles(): ReadonlyArray<Particle> {
    return this._particles;
  }

  private acquireParticle(): Particle {
    return this.pool.pop() ?? new Particle();
  }

  private releaseParticle(particle: Particle) {
    this.pool.push(particle);
  }

  private randFloatSpread(range: number): number {
    return (this.random() - 0.5) * range;
  }

  private emitOneParticle(): Particle {
    const particle = this.acquireParticle();

    particle.id = this.random();
    particle.life = 0;
    particle.maxLife = this.maxLife;

    this.shape.emit(particle, this.random);

    const phi = this.random() * Math.PI * 2;
    const theta = this.random() * this.rotationAngularVariance;

    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.cos(theta);
    const z = Math.sin(theta) * Math.sin(phi);

    const velocityMagnitude = Math.max(
      0,
      this.velocityMagnitude +
        this.randFloatSpread(this.velocityMagnitudeVariance)
    );

    particle.velocity
      .set(x, y, z)
      .multiplyScalar(velocityMagnitude)
      .applyQuaternion(this.rotation);

    this.onCreateParticle?.(particle);

    return particle;
  }

  private updateEmission(delta: number) {
    if (!this.emissionEnabled) return;
    if (this.emittedCount >= this.maxEmission) return;
    if (this.emissionRate <= 0) return;
    if (this._particles.length >= this.maxParticles) return;

    this.emissionTime += delta;

    const secondsPerParticle = 1 / this.emissionRate;
    if (!(secondsPerParticle > 0)) return;

    let toEmit = Math.floor(this.emissionTime / secondsPerParticle);
    if (toEmit <= 0) return;

    const remainingEmission = this.maxEmission - this.emittedCount;
    const availableSlots = this.maxParticles - this._particles.length;

    toEmit = Math.min(toEmit, remainingEmission, availableSlots);
    if (toEmit <= 0) return;

    this.emissionTime -= toEmit * secondsPerParticle;

    for (let i = 0; i < toEmit; i++) {
      this.emittedCount++;
      this._particles.push(this.emitOneParticle());
    }
  }

  private updateParticle(particle: Particle, delta: number) {
    particle.life = Math.min(particle.life + delta, particle.maxLife);

    const forces = this.tmpForces
      .copy(this.gravity)
      .multiplyScalar(this.gravityStrength);

    forces.addScaledVector(particle.velocity, -this.dragCoefficient);

    for (const attractor of this.attractors) {
      const radius = attractor.radius;
      if (radius <= EPSILON) continue;

      this.tmpDirection.subVectors(attractor.position, particle.position);
      const distance = this.tmpDirection.length();
      if (distance <= EPSILON) continue;

      this.tmpDirection.multiplyScalar(1 / distance);

      const ratio = distance / radius;
      const attractorForce = attractor.intensity / (1 + ratio * ratio);

      forces.addScaledVector(this.tmpDirection, attractorForce);
    }

    particle.velocity.addScaledVector(forces, delta);
    particle.position.addScaledVector(particle.velocity, delta);

    this.onUpdateParticle?.(particle);
  }

  private removeParticleAt(index: number) {
    const particle = this._particles[index];
    this.onRemoveParticle?.(particle);

    const lastIndex = this._particles.length - 1;
    if (index !== lastIndex) {
      this._particles[index] = this._particles[lastIndex];
    }
    this._particles.pop();

    this.releaseParticle(particle);
  }

  private updateParticles(delta: number) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const particle = this._particles[i];

      if (particle.life >= particle.maxLife) {
        this.removeParticleAt(i);
        continue;
      }

      this.updateParticle(particle, delta);
    }
  }

  public step(time: Time) {
    const dt = time.delta;
    if (dt <= 0) return;

    this.updateEmission(dt);
    this.updateParticles(dt);
  }

  public stopEmission() {
    this.emissionEnabled = false;
  }

  public dispose() {
    if (this.onRemoveParticle) {
      for (const particle of this._particles) {
        this.onRemoveParticle(particle);
      }
    }

    this.stopEmission();
    this._particles.length = 0;
    this.pool.length = 0;
  }
}
