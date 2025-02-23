import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { World } from "./Engine";

interface BloomParams {
  threshold?: number;
  strength?: number;
  radius?: number;
  exposure?: number;
}

export class SelectiveBloom {
  public BLOOM_SCENE: number;
  public bloomLayer: THREE.Layers;
  public darkMaterial: THREE.MeshBasicMaterial;
  public materials: { [uuid: string]: THREE.Material | THREE.Material[] };

  public params: BloomParams;
  private world: World;

  public renderScene: RenderPass;
  public bloomPass: UnrealBloomPass;
  public bloomComposer: EffectComposer;
  public mixPass: ShaderPass;
  public outputPass: OutputPass;
  public finalComposer: EffectComposer;

  constructor(world: World, params: BloomParams = {}) {
    this.params = {
      threshold: 0,
      strength: 1,
      radius: 0.5,
      exposure: 1,
      ...params,
    };

    this.world = world;

    this.BLOOM_SCENE = 1;
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(this.BLOOM_SCENE);

    this.darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    this.materials = {};

    this.renderScene = new RenderPass(
      this.world.scene.getScene(),
      this.world.view.camera
    );

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.strength!,
      this.params.radius!,
      this.params.threshold!
    );

    this.bloomComposer = new EffectComposer(
      this.world.renderer.getWebGLRenderer()
    );
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(this.renderScene);
    this.bloomComposer.addPass(this.bloomPass);

    this.mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader: SelectiveBloom.vertexShader,
        fragmentShader: SelectiveBloom.fragmentShader,
      }),
      "baseTexture"
    );
    this.mixPass.needsSwap = true;

    this.outputPass = new OutputPass();

    this.finalComposer = new EffectComposer(
      this.world.renderer.getWebGLRenderer()
    );
    this.finalComposer.addPass(this.renderScene);
    this.finalComposer.addPass(this.mixPass);
    this.finalComposer.addPass(this.outputPass);

    this.world.viewport.events.on("change", () => this.onResize());
  }

  static get vertexShader(): string {
    return `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;
  }

  static get fragmentShader(): string {
    return `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv );
      }
    `;
  }

  public render(): void {
    this.world.scene.getScene().traverse((obj) => this.darkenNonBloomed(obj));
    this.bloomComposer.render();
    this.world.scene.getScene().traverse((obj) => this.restoreMaterial(obj));
    this.finalComposer.render();
  }

  private darkenNonBloomed(obj: THREE.Object3D): void {
    if ((obj as THREE.Mesh).isMesh && !this.bloomLayer.test(obj.layers)) {
      this.materials[obj.uuid] = (obj as THREE.Mesh).material;
      (obj as THREE.Mesh).material = this.darkMaterial;
    }
  }

  private restoreMaterial(obj: THREE.Object3D): void {
    if (this.materials[obj.uuid]) {
      (obj as THREE.Mesh).material = this.materials[obj.uuid];
      delete this.materials[obj.uuid];
    }
  }

  private onResize(): void {
    const width = this.world.viewport.width;
    const height = this.world.viewport.height;
    this.bloomComposer.setSize(width, height);
    this.finalComposer.setSize(width, height);
  }

  public toggleBloom(object: THREE.Object3D): void {
    object.layers.toggle(this.BLOOM_SCENE);
  }
}
