# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Three.js stack (`src/three`)

- **React** mounts a container `div`; **[`Experience`](src/three/Experience.ts)** is the app entry (singleton for dev HMR).
- **[`Engine`](src/three/engine/Engine.ts)** owns WebGL: scene, camera, renderer, `Time`, `Viewport`, controls, `Loader`, etc. It takes **[`Config`](src/three/Config.ts)** (camera, antialias, `maxDevicePixelRatio`, **`#debug`** hash).
- **Debug**: open the app with `#debug` in the URL (e.g. `http://localhost:5173/#debug`) to enable Tweakpane, FPS/GPU stats, axes, and grid. Without it, those systems are not created.
- **Scene code** lives in **[`world/`](src/three/world/)** as **`SceneModule`** implementations (e.g. [`DemoScene`](src/three/world/DemoScene.ts)). Register new modules in `Experience`.
- **Environment maps**: [`Loader`](src/three/engine/Loader.ts) no longer mutates the scene. After `loadHDR` / `loadEXR` / cube loads, call **`applyEnvironmentToScene(scene, texture, options)`** (re-exported from `Loader`).
- **Singleton / HMR**: `Experience.getInstance(container)` keeps one instance; Vite stores it on `import.meta.hot.data` so edits to `Experience.ts` can rebind prototypes without losing WebGL state. Use a single canvas per app.
- **React StrictMode (dev)**: effects run mount → unmount → mount once, so the engine is created, destroyed, and created again. That is expected and helps catch leaks; not a bug.
- **Performance (after changes)**: use Chrome Performance, `renderer.info`, and verify `destroy()` / module teardown disposes listeners and GPU resources.

More detail: [`src/three/README.md`](src/three/README.md).

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

```bash
npm i three stats-gl stats.js tweakpane mersennetwister simplex-noise
```

```bash
npm i -D @types/three @tweakpane/core vite-plugin-glsl @types/mersennetwister
```
