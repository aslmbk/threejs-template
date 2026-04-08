# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # Start Vite dev server with HMR
bun run build      # Type-check + production build (tsc -b && vite build)
bun run lint       # ESLint
bun run preview    # Preview production build
```

No test runner is configured. Use `renderer.info` and Chrome Performance for runtime diagnostics.

## Architecture

The stack is React (mount only) + Three.js (all rendering). React manages a single `<div>` container; everything visual lives in `src/three/`.

### Layer hierarchy

| Layer | File | Role |
|-------|------|------|
| React entry | `App.tsx` | Holds a `ref` on the container div; calls `Experience.getInstance` / `destroy` in `useEffect` |
| Composition root | `src/three/Experience.ts` | Singleton. Creates `Config`, `Engine`, `DebugController`, and registers `SceneModule[]` |
| Infrastructure | `src/three/engine/Engine.ts` | Owns WebGL: renderer, scene, camera, `Time`, `Viewport`, `Loader`, `Cursor`, `Inputs`, `Rays`, `OrbitControls`, `Stats`, `Helpers`. No scene logic |
| Scene features | `src/three/world/` | Classes implementing `SceneModule` (only requires `destroy()`) |

### Config and debug mode

`Config` reads `location.hash` — visit `http://localhost:5173/#debug` to enable Tweakpane, FPS/GPU stats, axes, and grid. Without `#debug`, `engine.debug`, `engine.stats`, and `engine.helpers` are `undefined`.

### Adding a scene feature

1. Create a class in `world/` that implements `SceneModule`.
2. Use **named** handler references for event subscriptions (not anonymous lambdas) so `events.off(event, handler)` works in `destroy()`.
3. Register it in `Experience` constructor: `this.modules.push(new YourModule(...))`.
4. Dispose all geometries, materials, and textures in `destroy()`.

### Events system (`src/three/lib/Events.ts`)

Typed pub/sub with priority ordering. `on(event, callback, order?)` — order is 1–5, default 1. Lower order fires first. `off(event, callback?)` — omit callback to remove all listeners for that event. Used heavily by `Time` (tick loop) and `Viewport` (resize).

### Loader and environment maps

`Loader` never mutates the scene. After loading an HDR/EXR/cube texture, apply it explicitly:

```ts
import { applyEnvironmentToScene } from "./engine/Loader";

const tex = await engine.loader.loadHDRAsync({ url: "/env.hdr" });
applyEnvironmentToScene(engine.scene, tex, { setEnvironment: true, setBackground: true });
```

DRACO decoder path is set to `/draco/` — place decoder files in `public/draco/`.

### HMR behavior

`Experience.ts` uses `import.meta.hot.data` to survive Vite hot reloads without losing the WebGL context. Edits to `Experience.ts` rebind the singleton prototype. Edits deeper into `Engine` internals typically require a full page reload. React StrictMode causes a mount → unmount → mount cycle in dev — the engine is created, destroyed, and re-created once; this is expected.

### Particles (`src/three/particles/`)

`ParticleSystem` manages a list of `Emitter` + optional `ParticleRenderer` pairs. Call `system.step(time)` each tick. Finished emitters are auto-removed. `EmitterShape` is an interface — `PointShape` is the built-in implementation.

### Post-processing (`src/three/postprocessing/`)

`SelectiveBloom` implements a two-pass bloom: bloom composer darkens non-bloomed objects, renders bloom, then final composer composites. Call `selectiveBloom.render()` instead of `renderer.render()`. Mark objects for bloom with `selectiveBloom.toggleBloom(object)` (uses Three.js Layers, layer index 1).

### GLSL shaders

`vite-plugin-glsl` is configured — import `.glsl`, `.vert`, `.frag` files directly as strings.
