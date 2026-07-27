# Three.js architecture

## Layers

| Layer | Role |
|--------|------|
| `App.tsx` | React `ref` on the canvas container; `useEffect` calls `Experience.getInstance` / `destroy`. |
| `Experience` | Composition root: `Config`, `Engine`, and `SceneModule[]`. Private constructor; use `getInstance(domElement)`. |
| `Engine` | Infrastructure only: Three.js renderer, scene graph, subsystems in `engine/`. No game/scene rules. |
| `world/` | Scene features implementing `SceneModule` with their own `destroy()`. |

## Adding a feature

1. Create a class in `world/` that implements `SceneModule`.
2. Subscribe with **named** handlers so you can `time.events.off("tick", this.onTick)`.
3. Push `new YourModule(...)` in `Experience` (pass only what the module needs, e.g. `scene`, `time`, `loader`).
4. Dispose meshes/materials/geometries in `destroy()`.

## Events

[`lib/Events.ts`](lib/Events.ts) supports `off(event, handler)` for targeted unsubscribe. Avoid anonymous functions in `on()` if you need cleanup.

## Rendering

The tick loop calls `renderer.render(scene, camera)` at order 5. To take it over:

```ts
// Swap what gets rendered, keeping the engine's tick ordering.
engine.setRenderCallback(() => selectiveBloom.render());

// Or drive rendering entirely yourself.
engine.autoRender = false;
```

`engine.camera` is read-only; use `engine.setCamera(camera)` so the controls,
raycaster and projection matrix follow along.

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
