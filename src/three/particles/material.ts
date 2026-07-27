import * as THREE from "three/webgpu";
import {
  PI,
  PI2,
  cameraViewMatrix,
  dot,
  float,
  instancedBufferAttribute,
  length,
  max,
  mix,
  normalize,
  positionView,
  rotateUV,
  sin,
  smoothstep,
  sqrt,
  texture,
  time,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import type { ParticleAttributes } from "./ParticleRenderer";

export type ParticleLightOptions = {
  /** World-space position of the fake point light. */
  position?: THREE.Vector3;
  nearColor?: THREE.ColorRepresentation;
  farColor?: THREE.ColorRepresentation;
  /** `(near, far)` distances over which the light fades out to `farColor`. */
  falloff?: THREE.Vector2;
  intensity?: number;
  /** 0 leaves particles unlit, 1 applies the fake light fully. */
  factor?: number;
};

export type ParticleMaterialOptions = {
  /** The sprite artwork. */
  map: THREE.Texture;
  /** Ramps indexed by normalized life — `FloatInterpolant.toTexture()` and friends. */
  sizeOverLife: THREE.Texture;
  colorOverLife: THREE.Texture;
  twinkleOverLife: THREE.Texture;

  /** Overall size multiplier applied on top of the `sizeOverLife` ramp. */
  size?: number;
  /** Spin rate of the sprite artwork. 0 disables the spin. */
  spinSpeed?: number;

  light?: ParticleLightOptions;

  /**
   * Drives the twinkle and spin phase. Defaults to TSL's `time`, which the
   * renderer advances on its own; pass a uniform node to drive it yourself (to
   * follow `engine.time`'s timescale and clamping, for instance).
   */
  timeNode?: typeof time;
};

/**
 * The particle shader, written as TSL nodes.
 *
 * TSL compiles to WGSL on the WebGPU backend and to GLSL on the WebGL2 fallback
 * from this single source, which is why the shader lives here rather than in a
 * pair of `.glsl` files: `WebGPURenderer` cannot consume a hand-written
 * `ShaderMaterial` on *either* backend.
 *
 * Uniforms are exposed as fields so they can be animated or bound to a debug
 * pane without rebuilding the material.
 */
export class ParticleMaterial extends THREE.PointsNodeMaterial {
  public readonly uSize = uniform(1);
  public readonly uSpinSpeed = uniform(0);
  public readonly uLightFactor = uniform(0);
  public readonly uLightIntensity = uniform(1);
  public readonly uLightPosition = uniform(new THREE.Vector3());
  public readonly uLightNearColor = uniform(new THREE.Color(0xffffff));
  public readonly uLightFarColor = uniform(new THREE.Color(0xffffff));
  public readonly uLightFalloff = uniform(new THREE.Vector2(0, 1));

  constructor(
    attributes: ParticleAttributes,
    options: ParticleMaterialOptions,
  ) {
    super({
      transparent: true,
      depthWrite: false,
      // The fragment output is premultiplied, so plain AdditiveBlending would
      // apply alpha a second time. One/One is additive done right for it.
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      sizeAttenuation: true,
    });

    const {
      map,
      sizeOverLife,
      colorOverLife,
      twinkleOverLife,
      size = 1,
      spinSpeed = 0,
      light,
      timeNode = time,
    } = options;

    this.uSize.value = size;
    this.uSpinSpeed.value = spinSpeed;

    if (light) {
      if (light.position) this.uLightPosition.value.copy(light.position);
      if (light.nearColor !== undefined) {
        this.uLightNearColor.value.set(light.nearColor);
      }
      if (light.farColor !== undefined) {
        this.uLightFarColor.value.set(light.farColor);
      }
      if (light.falloff) this.uLightFalloff.value.copy(light.falloff);
      if (light.intensity !== undefined) {
        this.uLightIntensity.value = light.intensity;
      }
      if (light.factor !== undefined) this.uLightFactor.value = light.factor;
    }

    const data = instancedBufferAttribute<"vec2">(attributes.data, "vec2");
    const life = data.x;
    const seed = data.y;
    const lifeUv = vec2(life, 0.5);

    this.positionNode = instancedBufferAttribute<"vec3">(
      attributes.position,
      "vec3",
    );

    // Sampling a texture outside the fragment stage is fine — TSL emits an
    // explicit-LOD fetch there on its own.
    //
    // The x2 reconciles two size conventions. The old GLSL multiplied by the
    // full drawing-buffer height; three's size attenuation multiplies by
    // `screenDPR * (0.5 * logicalHeight)`, which is half of the same number.
    this.sizeNode = texture(sizeOverLife, lifeUv).r.mul(this.uSize).mul(2);

    // Constant across the four corners of a particle, so compute once in the
    // vertex stage and interpolate — the same split the old varyings had.
    const twinkle = texture(twinkleOverLife, lifeUv).r;
    const twinklePhase = sin(timeNode.mul(10).add(seed.mul(PI2)))
      .mul(0.5)
      .add(0.5);
    const rampColor = texture(colorOverLife, lifeUv);

    const vColor = varying(
      vec4(rampColor.rgb, rampColor.a.mul(mix(float(1), twinklePhase, twinkle))),
      "vParticleColor",
    );
    const vSpin = varying(
      this.uSpinSpeed.mul(timeNode.mul(PI).add(seed.mul(PI2))),
      "vParticleSpin",
    );

    const pointUv = uv();

    // A fake hemisphere normal across the quad, so a flat sprite still catches
    // the light like a ball. Deliberately built from the *unrotated* uv: the
    // artwork spins, the shading does not follow it.
    const x = pointUv.x.sub(0.5);
    const y = pointUv.y.sub(0.5);
    const z = sqrt(float(1).sub(x.mul(x)).sub(y.mul(y)));
    const normal = normalize(vec3(x, y, z.mul(0.5)));

    const lightPosition = cameraViewMatrix.mul(vec4(this.uLightPosition, 1)).xyz;
    const toLight = lightPosition.sub(positionView);
    // No y flip here, unlike the GLSL original: that compensated for
    // gl_PointCoord's top-left origin, and a sprite's uv already points up.
    const lightDP = max(dot(normal, normalize(toLight)), 0);

    const falloff = smoothstep(
      this.uLightFalloff.x,
      this.uLightFalloff.y,
      length(toLight),
    );
    const fakeColor = mix(this.uLightNearColor, this.uLightFarColor, falloff);

    const sampled = texture(map, rotateUV(pointUv, vSpin, vec2(0.5))).mul(
      vColor,
    );
    const lit = sampled.rgb.mul(
      mix(
        vec3(1),
        fakeColor.mul(lightDP).mul(this.uLightIntensity),
        this.uLightFactor,
      ),
    );

    // Premultiplied — pair with the additive blending set in the constructor.
    //
    // The GLSL original wrote `alpha *= mix(0.0, falloff, uLightFactor)`, which
    // is 0 whenever the fake light is off. That was survivable on WebGLRenderer,
    // which draws straight to the canvas. This renderer always resolves through
    // an intermediate buffer, and its output transform reads alpha 0 as "no
    // coverage" and emits pure black:
    //   `unpremultiplyAlpha = color.a.equal(0).select(vec4(0), ...)`
    // So alpha carries the sprite's own coverage here, and the distance falloff
    // only dims it once the light is actually switched on.
    this.colorNode = vec4(
      lit.mul(sampled.a),
      sampled.a.mul(mix(float(1), falloff, this.uLightFactor)),
    );
  }
}

/**
 * Convenience factory matching `ParticleRendererParams.material`:
 *
 * ```ts
 * new ParticleRenderer({
 *   parent: scene,
 *   maxParticles: 1000,
 *   material: createParticleMaterial({
 *     map, sizeOverLife, colorOverLife, twinkleOverLife,
 *   }),
 *   disposeMaterial: true,
 * });
 * ```
 */
export function createParticleMaterial(options: ParticleMaterialOptions) {
  return (attributes: ParticleAttributes) =>
    new ParticleMaterial(attributes, options);
}
