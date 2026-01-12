import * as THREE from "three";

type AtlasImageSource = CanvasImageSource & { width: number; height: number };

function isAtlasImageSource(image: unknown): image is AtlasImageSource {
  if (typeof image !== "object" || image === null) return false;
  if (!("width" in image) || !("height" in image)) return false;

  const { width, height } = image as { width?: unknown; height?: unknown };
  return typeof width === "number" && typeof height === "number";
}

export class TextureAtlas {
  private loader: THREE.TextureLoader;

  constructor(textureLoader?: THREE.TextureLoader) {
    this.loader = textureLoader ?? new THREE.TextureLoader();
  }

  public async load(texturePaths: string[]): Promise<THREE.DataArrayTexture> {
    const loadedTextures = await Promise.all(
      texturePaths.map((path) => {
        return this.loadTexture(path);
      })
    );

    if (loadedTextures.length === 0) {
      throw new Error("TextureAtlas.load: expected at least one texture path");
    }

    const firstImage = loadedTextures[0].image;
    if (!isAtlasImageSource(firstImage)) {
      throw new Error(
        "TextureAtlas.load: texture.image must be a CanvasImageSource with numeric width/height"
      );
    }

    const width = firstImage.width;
    const height = firstImage.height;
    const depth = loadedTextures.length;

    const size = width * height;
    const data = new Uint8Array(4 * size * depth);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("TextureAtlas.load: failed to get 2D canvas context");
    }

    for (let i = 0; i < depth; i++) {
      const texture = loadedTextures[i];
      const img = texture.image;
      if (!isAtlasImageSource(img)) {
        throw new Error(
          `TextureAtlas.load: texture at index ${i} has an unsupported image type`
        );
      }
      if (img.width !== width || img.height !== height) {
        throw new Error(
          `TextureAtlas.load: texture at index ${i} has mismatched dimensions (${img.width}x${img.height}), expected ${width}x${height}`
        );
      }

      context.setTransform(1, 0, 0, -1, 0, height);
      context.drawImage(img, 0, 0, width, height);
      context.setTransform(1, 0, 0, 1, 0, 0);

      const imgData = context.getImageData(0, 0, width, height).data;
      data.set(imgData, i * size * 4);

      texture.dispose();
    }

    const texture = new THREE.DataArrayTexture(data, width, height, depth);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (texture) => resolve(texture),
        undefined,
        (err) => reject(err)
      );
    });
  }
}
