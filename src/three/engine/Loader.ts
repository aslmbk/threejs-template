import * as THREE from "three";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { TextureAtlas, Events } from "../lib";

type LoaderOptions<Payload, Url extends string | string[] = string> = {
  url: Url;
  onLoad?: (payload: Payload) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
};

type GLTFLoaderOptions = LoaderOptions<GLTF>;
type TextureLoaderOptions = LoaderOptions<THREE.Texture>;
type CubeTextureLoaderOptions = LoaderOptions<THREE.CubeTexture, string[]>;
type HDR_EXRLoaderOptions = LoaderOptions<THREE.DataTexture>;

type AsyncOmitter<T> = Omit<T, "onLoad" | "onError">;

export type StartEventArgs = { url: string };
export type ProgressEventArgs = { total: number; loaded: number; url: string };
export type LoadEventArgs = void;
export type ErrorEventArgs = { url: string };

export class Loader {
  private loadingManager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private textureLoader: THREE.TextureLoader;
  private textureAtlas: TextureAtlas;
  private cubeTextureLoader: THREE.CubeTextureLoader;
  private hdrLoader: HDRLoader;
  private exrLoader: EXRLoader;

  public readonly events = new Events<{
    start: StartEventArgs;
    progress: ProgressEventArgs;
    load: LoadEventArgs;
    error: ErrorEventArgs;
  }>();

  constructor() {
    this.loadingManager = new THREE.LoadingManager(
      () => this.events.trigger("load"),
      (url, loaded, total) =>
        this.events.trigger("progress", { url, loaded, total }),
      (url) => this.events.trigger("error", { url }),
    );
    const itemStart = this.loadingManager.itemStart.bind(this.loadingManager);
    this.loadingManager.itemStart = (url) => {
      itemStart(url);
      this.events.trigger("start", { url });
    };

    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.dracoLoader = new DRACOLoader(this.loadingManager);
    this.dracoLoader.setDecoderPath("/draco/");
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.textureAtlas = new TextureAtlas(this.textureLoader);
    this.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager);
    this.hdrLoader = new HDRLoader(this.loadingManager);
    this.exrLoader = new EXRLoader(this.loadingManager);
  }

  public loadGLTF(options: GLTFLoaderOptions) {
    this.gltfLoader.load(
      options.url,
      (gltf) => {
        options.onLoad?.(gltf);
      },
      options.onProgress,
      options.onError,
    );
  }

  public loadGLTFAsync(options: AsyncOmitter<GLTFLoaderOptions>) {
    return this.gltfLoader.loadAsync(options.url, options.onProgress);
  }

  public loadTexture(options: TextureLoaderOptions) {
    return this.textureLoader.load(
      options.url,
      options.onLoad,
      options.onProgress,
      options.onError,
    );
  }

  public loadTextureAsync(options: AsyncOmitter<TextureLoaderOptions>) {
    return this.textureLoader.loadAsync(options.url, options.onProgress);
  }

  public loadTextureAtlas(urls: string[]) {
    return this.textureAtlas.load(urls);
  }

  public loadCubeTexture(options: CubeTextureLoaderOptions) {
    return this.cubeTextureLoader.load(
      options.url,
      (texture) => {
        options.onLoad?.(texture);
      },
      options.onProgress,
      options.onError,
    );
  }

  public async loadCubeTextureAsync(
    options: AsyncOmitter<CubeTextureLoaderOptions>,
  ) {
    return this.cubeTextureLoader.loadAsync(options.url, options.onProgress);
  }

  public loadHDR(options: HDR_EXRLoaderOptions) {
    return this.hdrLoader.load(
      options.url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        options.onLoad?.(texture);
      },
      options.onProgress,
      options.onError,
    );
  }

  public async loadHDRAsync(options: AsyncOmitter<HDR_EXRLoaderOptions>) {
    const texture = await this.hdrLoader.loadAsync(
      options.url,
      options.onProgress,
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }

  public loadEXR(options: HDR_EXRLoaderOptions) {
    return this.exrLoader.load(
      options.url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        options.onLoad?.(texture);
      },
      options.onProgress,
      options.onError,
    );
  }

  public async loadEXRAsync(options: AsyncOmitter<HDR_EXRLoaderOptions>) {
    const texture = await this.exrLoader.loadAsync(
      options.url,
      options.onProgress,
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
  }

  public destroy() {
    this.events.off("start");
    this.events.off("progress");
    this.events.off("load");
    this.events.off("error");
    this.dracoLoader.dispose();
  }
}

export {
  applyEnvironmentToScene,
  type EnvironmentApplyOptions,
} from "./environment";
