import { MATH } from "../lib";
import { Particle } from "./Particle";
import { ParticleRenderer } from "./ParticleRenderer";
import { Time } from "./types";
import * as THREE from "three";
import { Attractor } from "./Attractor";

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

  renderer: ParticleRenderer;
  shape: EmitterShape;

  attractors: Attractor[];

  onCreateParticle?: (particle: Particle) => void;
  onUpdateParticle?: (particle: Particle) => void;
  onRemoveParticle?: (particle: Particle) => void;
};

export class Emitter {
  private readonly params: EmitterParams;
  private readonly particles: Particle[] = [];
  private emissionTime = 0;
  private numParticlesEmitted = 0;

  constructor(params: EmitterParams) {
    this.params = params;
  }

  get isActive() {
    return (
      this.numParticlesEmitted < this.params.maxEmission ||
      this.particles.length > 0
    );
  }

  private canCreateParticle() {
    const secondsPerParticle = 1 / this.params.emissionRate;
    return (
      this.emissionTime >= secondsPerParticle &&
      this.numParticlesEmitted < this.params.maxEmission &&
      this.particles.length < this.params.maxParticles
    );
  }

  private emitParticle() {
    const particle = this.params.shape.emit();
    particle.maxLife = this.params.maxLife;

    const phi = MATH.random() * Math.PI * 2;
    const theta = MATH.random() * this.params.rotationAngularVariance;

    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.cos(theta);
    const z = Math.sin(theta) * Math.sin(phi);

    const velocityMagnitude =
      this.params.velocityMagnitude +
      THREE.MathUtils.randFloatSpread(this.params.velocityMagnitudeVariance);

    particle.velocity
      .set(x, y, z)
      .multiplyScalar(velocityMagnitude)
      .applyQuaternion(this.params.rotation);

    this.params.onCreateParticle?.(particle);

    return particle;
  }

  private updateEmission(time: Time) {
    this.emissionTime += time.delta;
    const secondsPerParticle = 1 / this.params.emissionRate;
    while (this.canCreateParticle()) {
      this.emissionTime -= secondsPerParticle;
      this.numParticlesEmitted++;
      const particle = this.emitParticle();
      this.particles.push(particle);
    }
  }

  private updateParticle(particle: Particle, time: Time) {
    particle.life = Math.min(particle.life + time.delta, particle.maxLife);

    const forces = this.params.gravity
      .clone()
      .multiplyScalar(this.params.gravityStrength);

    forces.add(
      particle.velocity.clone().multiplyScalar(-this.params.dragCoefficient)
    );

    for (const attractor of this.params.attractors) {
      const direction = attractor.position.clone().sub(particle.position);
      const distance = direction.length();
      direction.normalize();

      const attractorForce =
        attractor.intensity / (1 + (distance / attractor.radius) ** 2);
      forces.add(direction.multiplyScalar(attractorForce));
    }

    particle.velocity.add(forces.multiplyScalar(time.delta));

    const displacement = particle.velocity.clone().multiplyScalar(time.delta);
    particle.position.add(displacement);

    this.params.onUpdateParticle?.(particle);
  }

  private updateParticles(time: Time) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (particle.life >= particle.maxLife) {
        this.params.onRemoveParticle?.(particle);
        this.particles.splice(i, 1);
        continue;
      }
      this.updateParticle(particle, time);
    }
  }

  public step(time: Time) {
    this.updateEmission(time);
    this.updateParticles(time);

    this.params.renderer.updateFromParticles(this.particles);
  }

  public stopEmission() {
    this.params.maxEmission = 0;
    this.params.maxParticles = 0;
  }

  public dispose() {
    if (this.params.onRemoveParticle) {
      this.particles.forEach(this.params.onRemoveParticle);
    }
    this.stopEmission();
    this.particles.splice(0, this.particles.length);
    this.params.renderer.dispose();
  }
}

export class EmitterShape {
  emit() {
    return new Particle();
  }
}
