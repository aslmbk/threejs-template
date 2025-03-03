import * as THREE from "three";
import vertexShader from "../shaders/particles/vertex.glsl";
import fragmentShader from "../shaders/particles/fragment.glsl";

export class Particles {
  public geometry: THREE.SphereGeometry;
  public material: THREE.ShaderMaterial;
  public points: THREE.Points;

  constructor() {
    this.geometry = new THREE.SphereGeometry(3);
    this.geometry.setIndex(null);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uSize: new THREE.Uniform(0.1),
        uResolution: new THREE.Uniform(new THREE.Vector2(1, 1)),
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
}
