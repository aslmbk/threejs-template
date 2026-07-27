import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export class SelectiveBloom {
  public BLOOM_SCENE: number;
  public bloomLayer: THREE.Layers;
  public darkMaterial: THREE.MeshBasicMaterial;
  public materials: { [uuid: string]: THREE.Material | THREE.Material[] };

  // One black stand-in per renderable family. A Sprite cannot be drawn with a
  // MeshBasicMaterial at all (the sprite path reads material.rotation and
  // sizeAttenuation), and Points drawn with one lose their point size.
  private readonly darkLineMaterial: THREE.LineBasicMaterial;
  private readonly darkPointsMaterial: THREE.PointsMaterial;
  private readonly darkSpriteMaterial: THREE.SpriteMaterial;

  private readonly darkenedObjects: THREE.Object3D[] = [];
  private readonly blackColor = new THREE.Color(0x000000);

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  public renderScene: RenderPass;
  public bloomPass: UnrealBloomPass;
  public bloomComposer: EffectComposer;
  public mixPass: ShaderPass;
  public outputPass: OutputPass;
  public finalComposer: EffectComposer;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.BLOOM_SCENE = 1;
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(this.BLOOM_SCENE);

    this.darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
    this.darkLineMaterial = new THREE.LineBasicMaterial({ color: "black" });
    this.darkPointsMaterial = new THREE.PointsMaterial({ color: "black" });
    this.darkSpriteMaterial = new THREE.SpriteMaterial({ color: "black" });
    this.materials = {};

    this.renderScene = new RenderPass(this.scene, this.camera);

    this.bloomPass = new UnrealBloomPass(
      renderer.getSize(new THREE.Vector2()),
      1,
      0.5,
      0
    );

    this.bloomComposer = new EffectComposer(this.renderer);
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

    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(this.renderScene);
    this.finalComposer.addPass(this.mixPass);
    this.finalComposer.addPass(this.outputPass);
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
    const clearColor = this.renderScene.clearColor;
    this.darkenedObjects.splice(0, this.darkenedObjects.length);
    this.scene.traverse((obj) => this.darkenNonBloomed(obj));
    this.renderScene.clearColor = this.blackColor;
    this.bloomComposer.render();
    for (const obj of this.darkenedObjects) {
      this.restoreMaterial(obj);
    }
    this.darkenedObjects.splice(0, this.darkenedObjects.length);
    this.renderScene.clearColor = clearColor;
    this.finalComposer.render();
  }

  /**
   * The stand-in only has to render black — anything black contributes nothing
   * to the bloom pass regardless of its size. Depth and blend state come from
   * three's defaults for the type, so an object that disables depth writes is
   * approximated rather than mirrored exactly.
   */
  private darkMaterialFor(obj: THREE.Object3D): THREE.Material | null {
    const o = obj as THREE.Object3D & {
      isMesh?: boolean;
      isLine?: boolean;
      isPoints?: boolean;
      isSprite?: boolean;
    };

    if (o.isMesh) return this.darkMaterial;
    if (o.isLine) return this.darkLineMaterial;
    if (o.isPoints) return this.darkPointsMaterial;
    if (o.isSprite) return this.darkSpriteMaterial;
    return null;
  }

  private darkenNonBloomed(obj: THREE.Object3D): void {
    if (this.bloomLayer.test(obj.layers)) return;

    const dark = this.darkMaterialFor(obj);
    if (dark === null) return;

    const o = obj as THREE.Mesh;
    this.materials[obj.uuid] = o.material;
    o.material = dark;
    this.darkenedObjects.push(obj);
  }

  private restoreMaterial(obj: THREE.Object3D): void {
    if (this.materials[obj.uuid]) {
      (obj as THREE.Mesh).material = this.materials[obj.uuid];
      delete this.materials[obj.uuid];
    }
  }

  public resize(width: number, height: number): void {
    this.bloomComposer.setSize(width, height);
    this.finalComposer.setSize(width, height);
  }

  public toggleBloom(object: THREE.Object3D): void {
    object.layers.toggle(this.BLOOM_SCENE);
  }

  /**
   * Releases both composers' render targets, the passes' own targets and
   * materials, and the black stand-ins. Composers do not dispose the passes
   * added to them and passes do not dispose the composer, so both are needed;
   * RenderPass owns nothing and has no dispose(). Materials belonging to the
   * scene are only released from the swap table, never disposed — they are not
   * ours.
   */
  public dispose(): void {
    // Put back anything still swapped out, in case render() was interrupted.
    for (const object of this.darkenedObjects) {
      this.restoreMaterial(object);
    }
    this.darkenedObjects.length = 0;
    this.materials = {};

    this.bloomComposer.dispose();
    this.finalComposer.dispose();

    this.bloomPass.dispose();
    this.mixPass.dispose();
    this.outputPass.dispose();

    this.darkMaterial.dispose();
    this.darkLineMaterial.dispose();
    this.darkPointsMaterial.dispose();
    this.darkSpriteMaterial.dispose();
  }
}
