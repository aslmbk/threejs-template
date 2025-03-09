import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

type GLTFLoaderOptions = {
  url: string;
  onLoad: (gltf: GLTF) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
};

type TextureLoaderOptions = {
  url: string;
  onLoad: (texture: THREE.Texture) => void;
  onProgress?: (event: ProgressEvent) => void;
  onError?: (err: unknown) => void;
};

export class Loader {
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.textureLoader = new THREE.TextureLoader();
  }

  public loadGLTF(options: GLTFLoaderOptions) {
    this.gltfLoader.load(
      options.url,
      options.onLoad,
      options.onProgress,
      options.onError
    );
  }

  public async loadGLTFAsync(
    options: Pick<GLTFLoaderOptions, "url" | "onProgress">
  ) {
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

  public loadTextureAsync(
    options: Pick<TextureLoaderOptions, "url" | "onProgress">
  ) {
    return this.textureLoader.loadAsync(options.url, options.onProgress);
  }
}
