import * as THREE from "three";
import { type GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { TextureAtlas, Events } from "../lib";

type EnvironmentOptions = {
  setEnvironment?: boolean;
  setBackground?: boolean;
  environmentMap?: THREE.Texture;
  environmentIntensity?: number;
  environmentRotation?: THREE.Euler;
  backgroundBlurriness?: number;
  backgroundIntensity?: number;
  backgroundRotation?: THREE.Euler;
};

type GLTFLoaderOptions = {
  url: string;
  onLoad: (gltf: GLTF) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
};

type TextureLoaderOptions = {
  url: string;
  onLoad?: (texture: THREE.Texture) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
};

type CubeTextureLoaderOptions = {
  urls: string[];
  onLoad?: (texture: THREE.CubeTexture) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
} & EnvironmentOptions;

type RGBE_EXRLoaderOptions = {
  url: string;
  onLoad?: (texture: THREE.DataTexture) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
} & EnvironmentOptions;

type AsyncOmitter<T> = Omit<T, "onLoad" | "onError">;

export type StartEventArgs = { url: string };
export type ProgressEventArgs = { total: number; loaded: number; url: string };
export type LoadEventArgs = void;
export type ErrorEventArgs = { url: string };

export class Loader {
  public readonly scene: THREE.Scene;

  private loadingManager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private textureAtlas: TextureAtlas;
  private cubeTextureLoader: THREE.CubeTextureLoader;
  private rgbeLoader: RGBELoader;
  private exrLoader: EXRLoader;

  public readonly events = new Events<{
    start: StartEventArgs;
    progress: ProgressEventArgs;
    load: LoadEventArgs;
    error: ErrorEventArgs;
  }>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.loadingManager = new THREE.LoadingManager(
      () => this.events.trigger("load"),
      (url, loaded, total) =>
        this.events.trigger("progress", { url, loaded, total }),
      (url) => this.events.trigger("error", { url })
    );
    const itemStart = this.loadingManager.itemStart.bind(this.loadingManager);
    this.loadingManager.itemStart = (url) => {
      itemStart(url);
      this.events.trigger("start", { url });
    };

    this.gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader(this.loadingManager);
    dracoLoader.setDecoderPath("/draco/");
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.textureAtlas = new TextureAtlas(this.textureLoader);
    this.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager);
    this.rgbeLoader = new RGBELoader(this.loadingManager);
    this.exrLoader = new EXRLoader(this.loadingManager);
  }

  private setEnvironment(options: EnvironmentOptions) {
    if (!options.setEnvironment && !options.setBackground) return;
    if (options.setEnvironment && options.environmentMap) {
      this.scene.environment = options.environmentMap;
    }
    if (options.environmentIntensity) {
      this.scene.environmentIntensity = options.environmentIntensity;
    }
    if (options.environmentRotation) {
      this.scene.environmentRotation = options.environmentRotation;
    }
    if (options.setBackground && options.environmentMap) {
      this.scene.background = options.environmentMap;
    }
    if (options.backgroundBlurriness) {
      this.scene.backgroundBlurriness = options.backgroundBlurriness;
    }
    if (options.backgroundIntensity) {
      this.scene.backgroundIntensity = options.backgroundIntensity;
    }
    if (options.backgroundRotation) {
      this.scene.backgroundRotation = options.backgroundRotation;
    }
  }

  public loadGLTF(options: GLTFLoaderOptions) {
    this.gltfLoader.load(
      options.url,
      options.onLoad,
      options.onProgress,
      options.onError
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
      options.onError
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
      options.urls,
      (texture) => {
        this.setEnvironment({ ...options, environmentMap: texture });
        options.onLoad?.(texture);
      },
      options.onProgress,
      options.onError
    );
  }

  public async loadCubeTextureAsync(
    options: AsyncOmitter<CubeTextureLoaderOptions>
  ) {
    const texture = await this.cubeTextureLoader.loadAsync(
      options.urls,
      options.onProgress
    );
    this.setEnvironment({ ...options, environmentMap: texture });
    return texture;
  }

  public loadRGBE(options: RGBE_EXRLoaderOptions) {
    return this.rgbeLoader.load(
      options.url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.setEnvironment({ ...options, environmentMap: texture });
        options.onLoad?.(texture);
      },
      options.onProgress,
      options.onError
    );
  }

  public async loadRGBEAsync(options: AsyncOmitter<RGBE_EXRLoaderOptions>) {
    const texture = await this.rgbeLoader.loadAsync(
      options.url,
      options.onProgress
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.setEnvironment({ ...options, environmentMap: texture });
    return texture;
  }

  public loadEXR(options: RGBE_EXRLoaderOptions) {
    return this.exrLoader.load(
      options.url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.setEnvironment({ ...options, environmentMap: texture });
        options.onLoad?.(texture);
      },
      options.onProgress,
      options.onError
    );
  }

  public async loadEXRAsync(options: AsyncOmitter<RGBE_EXRLoaderOptions>) {
    const texture = await this.exrLoader.loadAsync(
      options.url,
      options.onProgress
    );
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.setEnvironment({ ...options, environmentMap: texture });
    return texture;
  }
}
