# Three.js architecture

## Layers

| Layer | Role |
|--------|------|
| `App.tsx` | React `ref` on the canvas container; `useEffect` calls `Experience.getInstance` / `destroy`, and routes `engine.ready` rejections to the `ErrorBoundary` from `main.tsx`. |
| `Experience` | Composition root: `Config`, `Engine`, and `SceneModule[]`. Private constructor; use `getInstance(domElement)`. |
| `Engine` | Infrastructure only: the renderer, scene graph, subsystems in `engine/`. No game/scene rules. |
| `world/` | Scene features implementing `SceneModule` with their own `destroy()`. |

## Renderer

`WebGPURenderer` from `three/webgpu`, which is backend-agnostic: it tries WebGPU
and falls back to WebGL2 on its own inside `init()`. Import everything from
`three/webgpu` (a superset of `three`) and nodes from `three/tsl`.

```ts
await engine.ready;                          // backend up, loop running
engine.renderer.backend.isWebGPUBackend;     // which one won
engine.renderer.coordinateSystem;            // WebGPU clips depth 0..1, WebGL -1..1
```

Add `#webgl` to the URL to force the fallback path (`#debug&webgl` for both).

Startup is asynchronous — `renderer.render()` throws before a backend exists.
The constructor stays synchronous and hands you `ready`; **observe it**, or a
failure to start becomes an unhandled rejection and a blank page.

## Adding a feature

1. Create a class in `world/` that implements `SceneModule`.
2. Subscribe with **named** handlers so you can `time.events.off("tick", this.onTick)`.
3. Push `new YourModule(...)` in `Experience` (pass only what the module needs, e.g. `scene`, `time`, `loader`).
4. Dispose meshes/materials/geometries in `destroy()`.

## Events

[`lib/Events.ts`](lib/Events.ts) supports `off(event, handler)` for targeted unsubscribe. Avoid anonymous functions in `on()` if you need cleanup.

## Rendering

The tick loop calls `renderer.render(scene, camera)` at order 5, driven from
`renderer.setAnimationLoop` — `Time` no longer schedules its own rAF, because the
renderer already runs one. To take rendering over:

```ts
// Swap what gets rendered, keeping the engine's tick ordering.
engine.setRenderCallback(() => selectiveBloom.render());

// Or drive rendering entirely yourself.
engine.autoRender = false;
```

`engine.camera` is read-only; use `engine.setCamera(camera)` so the controls,
raycaster and projection matrix follow along.

A post-processing pipeline needs two things wired, not three — `PassNode` and
`BloomNode` pick up the renderer's size themselves each frame:

```ts
engine.setRenderCallback(() => bloom.render());
// and bloom.dispose() from your module's destroy()
```

## Shaders

TSL only. `WebGPURenderer` rejects a hand-written `ShaderMaterial` on both
backends, and the WebGL2 fallback compiles GLSL *from nodes* rather than
accepting your own. See [`particles/material.ts`](particles/material.ts) for a
worked example.

Careful with premultiplied output: the renderer resolves through an intermediate
buffer whose output transform maps alpha `0` to pure black, so a fragment must
still write real coverage into alpha even under additive blending.

## Loader and environment

`Loader` loads assets only. To set IBL / background:

```ts
import { Loader, applyEnvironmentToScene } from "./engine/Loader";

const tex = await engine.loader.loadHDRAsync({ url: "/env.hdr" });
applyEnvironmentToScene(engine.scene, tex, {
  setEnvironment: true,
  setBackground: true,
});
```

## HMR

Editing `Experience.ts` preserves the singleton instance via Vite `hot.data` and `rebindSingletonPrototype()`. Deeper changes (e.g. `Engine` internals) may require a full page reload.
