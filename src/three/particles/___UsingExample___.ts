import * as THREE from "three";
import { TimeEventArgs } from "../engine/Time";
import { Viewport, ViewportEventArgs } from "../engine/Viewport";
import {
  vertexShader,
  fragmentShader,
  ParticleRenderer,
  Emitter,
  Particle,
  EmitterShape,
  ParticleSystem,
  Attractor,
} from "./";
import { Loader } from "../engine/Loader";
import { MATH, NOISE } from "../lib";

export class ParticlesManager {
  private particleSystem!: ParticleSystem;
  private fireMaterial!: THREE.ShaderMaterial;
  private smokeMaterial!: THREE.ShaderMaterial;
  private materials: THREE.ShaderMaterial[] = [];
  private fireLight: THREE.PointLight | null = null;

  public scene = new THREE.Group();

  constructor(loader: Loader, viewport: Viewport) {
    this.particleSystem = new ParticleSystem();
    Promise.all([
      this.initFireMaterial(loader, viewport),
      this.initSmokeMaterial(loader, viewport),
    ]).then(() => {
      this.createFireLight();
      this.createFireEmitter();
      this.createSmokeEmitter();
    });
  }

  private async initFireMaterial(loader: Loader, viewport: Viewport) {
    const mapTexture = await loader.loadTextureAsync({
      url: "/textures/fire.png",
    });

    const sizeOverLife = new MATH.FloatInterpolant([
      { time: 0, value: 3 },
      { time: 0.25, value: 10 },
      { time: 2, value: 0 },
    ]);

    const twinkleOverLife = new MATH.FloatInterpolant([
      { time: 0, value: 0 },
      { time: 1, value: 0 },
    ]);

    const alphaOverLife = new MATH.FloatInterpolant([
      { time: 0, value: 0 },
      { time: 0.25, value: 1 },
      { time: 2, value: 0 },
    ]);

    const colorOverLife = new MATH.ColorInterpolant([
      { time: 0, value: new THREE.Color(0xffffc0) },
      { time: 1, value: new THREE.Color(0xff0000) },
    ]);

    this.fireMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uMap: new THREE.Uniform(mapTexture),
        uTime: new THREE.Uniform(0),
        uResolution: new THREE.Uniform(
          new THREE.Vector2(
            viewport.width * viewport.pixelRatio,
            viewport.height * viewport.pixelRatio
          )
        ),
        uSize: new THREE.Uniform(0.2),
        uSizeOverLife: new THREE.Uniform(sizeOverLife.toTexture()),
        uColorOverLife: new THREE.Uniform(
          colorOverLife.toTexture(alphaOverLife)
        ),
        uTwinkleOverLife: new THREE.Uniform(twinkleOverLife.toTexture()),
        uSpinSpeed: new THREE.Uniform(0),
        uLightFactor: new THREE.Uniform(0),
        uLightIntensity: new THREE.Uniform(0),
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.materials.push(this.fireMaterial);
  }

  private async initSmokeMaterial(loader: Loader, viewport: Viewport) {
    const mapTexture = await loader.loadTextureAsync({
      url: "/textures/smoke.png",
    });

    const sizeOverLife = new MATH.FloatInterpolant([
      { time: 0, value: 3 },
      { time: 6, value: 7 },
    ]);

    const twinkleOverLife = new MATH.FloatInterpolant([
      { time: 0, value: 0 },
      { time: 1, value: 0 },
    ]);

    const alphaOverLife = new MATH.FloatInterpolant([
      { time: 0, value: 0 },
      { time: 0.5, value: 0.85 },
      { time: 6, value: 0 },
    ]);

    const colorOverLife = new MATH.ColorInterpolant([
      { time: 0, value: new THREE.Color(0xc0c0c0) },
      { time: 1, value: new THREE.Color(0x404040) },
    ]);

    this.smokeMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uMap: new THREE.Uniform(mapTexture),
        uTime: new THREE.Uniform(0),
        uResolution: new THREE.Uniform(
          new THREE.Vector2(
            viewport.width * viewport.pixelRatio,
            viewport.height * viewport.pixelRatio
          )
        ),
        uSize: new THREE.Uniform(0.5),
        uSizeOverLife: new THREE.Uniform(sizeOverLife.toTexture()),
        uColorOverLife: new THREE.Uniform(
          colorOverLife.toTexture(alphaOverLife)
        ),
        uTwinkleOverLife: new THREE.Uniform(twinkleOverLife.toTexture()),
        uSpinSpeed: new THREE.Uniform(0),
        uLightFactor: new THREE.Uniform(1),
        uLightIntensity: new THREE.Uniform(4),
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.materials.push(this.smokeMaterial);
  }

  private createFireEmitter() {
    const material = this.fireMaterial.clone();
    this.materials.push(material);
    const particleRenderer = new ParticleRenderer({
      material: material,
      maxParticles: 200,
      scene: this.scene,
      frustumCulled: false,
    });

    material.uniforms.uSpinSpeed.value = Math.PI / 4;

    const attractor = new Attractor(new THREE.Vector3(0, 5, 0), 2, 3);

    const emiiter = new Emitter({
      renderer: particleRenderer,
      shape: new PointShape({ positionRadiusVariance: 0.5 }),
      maxLife: 2,
      velocityMagnitude: 4,
      velocityMagnitudeVariance: 1,
      rotation: new THREE.Quaternion(),
      rotationAngularVariance: Math.PI / 8,
      gravity: new THREE.Vector3(0, -9.81, 0),
      gravityStrength: 0,
      dragCoefficient: 0.5,
      maxParticles: 200,
      emissionRate: 50,
      maxEmission: Number.MAX_SAFE_INTEGER,
      attractors: [attractor],
    });
    this.particleSystem.addEmitter(emiiter);
    return emiiter;
  }

  private createSmokeEmitter() {
    const material = this.smokeMaterial.clone();
    this.materials.push(material);
    const particleRenderer = new ParticleRenderer({
      material: material,
      maxParticles: 500,
      scene: this.scene,
      frustumCulled: false,
    });

    material.uniforms.uSpinSpeed.value = Math.PI / 8;

    const attractor = new Attractor(new THREE.Vector3(10, 21, 0), 1.8, 8);

    const emiiter = new Emitter({
      renderer: particleRenderer,
      shape: new PointShape({
        positionRadiusVariance: 1,
        position: new THREE.Vector3(0, 8, 0),
      }),
      maxLife: 6,
      velocityMagnitude: 4,
      velocityMagnitudeVariance: 1,
      rotation: new THREE.Quaternion(),
      rotationAngularVariance: Math.PI / 8,
      gravity: new THREE.Vector3(0, -9.81, 0),
      gravityStrength: 0,
      dragCoefficient: 0.2,
      maxParticles: 500,
      emissionRate: 40,
      maxEmission: Number.MAX_SAFE_INTEGER,
      attractors: [attractor],
    });
    this.particleSystem.addEmitter(emiiter);
    return emiiter;
  }

  private createFireLight() {
    this.fireLight = new THREE.PointLight(0xf8b867, 100);
    this.fireLight.position.set(0, 4, 0);
    this.scene.add(this.fireLight);
  }

  public update(params: TimeEventArgs) {
    this.particleSystem.step(params);

    const noise = NOISE.noise1D(params.elapsed * 4);

    for (let i = this.materials.length - 1; i >= 0; i--) {
      if (this.materials[i].userData.isDisposed) {
        this.materials.splice(i, 1);
        continue;
      }
      this.materials[i].uniforms.uTime.value = params.elapsed;
      this.materials[i].uniforms.uLightIntensity.value = MATH.remap(
        -1,
        1,
        0.75,
        2.0,
        noise
      );
    }

    if (this.fireLight) {
      this.fireLight.intensity = MATH.remap(-1, 1, 15, 50, noise);
    }
  }

  public resize(params: ViewportEventArgs) {
    for (const material of this.materials) {
      material.uniforms.uResolution.value.set(
        params.width * params.pixelRatio,
        params.height * params.pixelRatio
      );
    }
  }
}

class PointShape extends EmitterShape {
  public readonly position: THREE.Vector3;
  private positionRadiusVariance: number;

  constructor(params?: {
    position?: THREE.Vector3;
    positionRadiusVariance?: number;
  }) {
    super();
    this.position = params?.position ?? new THREE.Vector3();
    this.positionRadiusVariance = params?.positionRadiusVariance ?? 0;
  }

  emit() {
    const particle = new Particle();
    particle.position.copy(this.position);

    const phi = MATH.random() * Math.PI * 2;
    const theta = MATH.random() * Math.PI;
    const radius = MATH.random() * this.positionRadiusVariance;

    const direction = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );
    particle.position.add(direction.multiplyScalar(radius));

    return particle;
  }
}
