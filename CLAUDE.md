# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # Start Vite dev server with HMR
bun run build      # Type-check + production build (tsc -b && vite build)
bun run lint       # ESLint
bun run preview    # Preview production build
```

No test runner is configured. Use `renderer.info` and Chrome Performance for runtime diagnostics. `tsc` runs with `strict` on — keep it that way, the codebase is clean under it.

The `webgl` branch keeps the pre-migration version of this template: `WebGLRenderer`, hand-written GLSL, `EffectComposer`. Nothing on `main` targets WebGL directly any more.

## Architecture

The stack is React (mount only) + Three.js (all rendering). React manages a single `<div>` container; everything visual lives in `src/three/`.

### Layer hierarchy

| Layer | File | Role |
|-------|------|------|
| React entry | `App.tsx` | Holds a `ref` on the container div; calls `Experience.getInstance` / `destroy` in `useEffect`, and bridges `engine.ready` rejections into `ErrorBoundary` |
| Composition root | `src/three/Experience.ts` | Singleton. Creates `Config` and `Engine`, and registers `SceneModule[]` |
| Infrastructure | `src/three/engine/Engine.ts` | Owns the renderer, scene, camera, `Time`, `Viewport`, `Loader`, `Cursor`, `Inputs`, `Rays`, `OrbitControls`, `Stats`, `Helpers`. No scene logic |
| Scene features | `src/three/world/` | Classes implementing `SceneModule` (only requires `destroy()`) |

### WebGPU, and why every import says `three/webgpu`

Everything under `src/three/` imports `* as THREE from "three/webgpu"`, never from `"three"`. Three ships three entry points over one shared `three.core.js`:

- `three` — core + `WebGLRenderer` + the GLSL `ShaderLib`
- `three/webgpu` — core + the node system + `WebGPURenderer` with **both** backends
- `three/tsl` — a pure re-export of the node functions, no weight of its own

The classes are the *same objects* across entry points (`Scene` from `three` `===` `Scene` from `three/webgpu`), so mixing is safe and does not duplicate the core — but there is no reason to: `three/webgpu` is a superset of `three` minus seven WebGL-only exports (`ShaderChunk`, `ShaderLib`, `UniformsLib`, `UniformsUtils`, `WebGLCubeRenderTarget`, `WebGLRenderer`, `WebGLUtils`). Addons under `three/addons/*` import from `"three"` and work unchanged; the `WebGLRenderer` class itself gets tree-shaken out of the bundle.

`WebGPURenderer` is not "the WebGPU renderer" — it is backend-agnostic. Inside `await renderer.init()` it tries WebGPU and silently rebuilds itself on a WebGL2 backend if that fails. **Do not write a capability check**; `three/addons/capabilities/WebGPU.js` additionally uses top-level await. To find out which backend won, read `renderer.backend.isWebGPUBackend` after `ready`.

Watch out for `renderer.coordinateSystem`: WebGPU clips depth to `0..1`, WebGL to `-1..1`. Stock materials do not care, hand-written projection maths does.

### Startup is asynchronous

`renderer.render()` throws before the backend exists, so `Engine`'s constructor stays synchronous but exposes `ready: Promise<void>`; nothing is drawn until it resolves. Observe it — an unobserved rejection leaves a blank page. `App.tsx` stores the rejection in state and rethrows it during render, which is what carries an async failure to a boundary.

`Engine.destroy()` can run while `init()` is still in flight (React StrictMode does this on every mount). `renderer.dispose()` is a no-op before initialization, so `initAsync` re-checks `destroyed` after its await and disposes there instead.

### The tick loop

`Time` no longer schedules its own `requestAnimationFrame`. Once the backend is up, `Engine` calls `renderer.setAnimationLoop(() => time.tick())`. The renderer runs an rAF loop unconditionally from `init()` onwards, so a second one would mean two callbacks per frame; driving `Time` from it also puts the tick after `nodeFrame.update()` (which advances TSL's `time` / `deltaTime`) and after `info.reset()`.

`Time` still extends `THREE.Timer` and connects it to the Page Visibility API, and `tick` deltas are still clamped to `config.maxDelta` and scaled by the timescale; `getElapsed()` is the integral of those clamped deltas.

Rendering happens at tick order 5. `engine.setRenderCallback(fn)` replaces `renderer.render(scene, camera)` — the hook for a post-processing pipeline. `engine.autoRender = false` disables engine-driven rendering entirely. `engine.camera` is a read-only getter; call `engine.setCamera(camera)` so `OrbitControls`, `Rays` and the projection matrix stay in sync.

### Config and debug mode

`Config` parses `location.hash` as a parameter list:

- `#debug` — Tweakpane, FPS/GPU stats, axes and grid. Without it `engine.debug`, `engine.stats` and `engine.helpers` are `undefined`.
- `#webgl` — pins the renderer to the WebGL2 backend, so the fallback path is testable on a machine where WebGPU works. Combine them: `#debug&webgl`.

`Config` also carries `maxDelta`, `toneMapping` / `toneMappingExposure`, `shadows` / `shadowMapType`, `antialias`, `maxDevicePixelRatio` and the camera frustum, all defaulting to Three.js' own values.

`engine/debugPanel.ts` exposes those settings plus a read-only `renderer.info` folder. Unlike the WebGL renderer, **nothing here needs a manual material invalidation**: `shadowMap.enabled` / `shadowMap.type` are part of the per-draw cache key in `NodeManager.getCacheKey()`, and `toneMapping` / `outputColorSpace` are keyed by `getOutputCacheKey()`, which rebuilds the output pass on its own.

### Shaders are TSL, not GLSL

`WebGPURenderer` cannot render a hand-written `ShaderMaterial` on **either** backend — `NodeBuilder` reports `Material "ShaderMaterial" is not compatible` and falls back to a blank `NodeMaterial`. The WebGL2 fallback does not rescue GLSL: it generates GLSL *from nodes* via `GLSLNodeBuilder`. Stock materials (`MeshStandardMaterial` and friends) are mapped to node equivalents automatically by `StandardNodeLibrary`.

So shading is written in TSL, which compiles to WGSL and GLSL from one source. There is no `vite-plugin-glsl` and no `*.glsl` import declaration any more.

One portability trap worth knowing: the renderer always resolves through an intermediate buffer, and its output transform is
`unpremultiplyAlpha = color.a.equal(0).select(vec4(0), ...)`. **A fragment that writes alpha 0 comes out pure black**, even under additive blending — unlike `WebGLRenderer`, which drew straight to the canvas. Premultiplied output must still carry real coverage in alpha.

### Engine subsystems (`src/three/engine/`)

Every subsystem exposes `destroy()` (no `dispose()` variants) and unsubscribes its own listeners there. Beyond that:

- `Cursor` emits `PointerEvent`s (mouse, touch and pen), except `click` which stays a `MouseEvent`. `x`/`y` are normalized device coordinates ready for `Rays`. Bounds are cached and recomputed lazily on the next pointer event.
- `Inputs.keys` is indexed by both `KeyboardEvent.code` (prefer it — layout independent) and `KeyboardEvent.key`. Held keys are released on window `blur`, which emits `reset`.
- `Stats` needs `attach(renderer)` — `Engine` calls it from `ready`. stats-gl reads `renderer.info` and flips `backend.trackTimestamp` on; without it the GPU and CPT panels stay at zero.
- `Engine.destroy()` does **not** call `forceContextLoss()` — there is no such method on the new renderer, and `WebGLBackend.dispose()` calls `WEBGL_lose_context.loseContext()` itself.

### Adding a scene feature

1. Create a class in `world/` that implements `SceneModule`.
2. Use **named** handler references for event subscriptions (not anonymous lambdas) so `events.off(event, handler)` works in `destroy()`.
3. Register it in `Experience` constructor: `this.modules.push(new YourModule(...))`.
4. Dispose all geometries, materials, and textures in `destroy()`.

### Events system (`src/three/lib/Events.ts`)

Typed pub/sub with priority ordering. `on(event, callback, order?)` — order is 1–5, default 1. Lower order fires first. `off(event, callback?)` — omit callback to remove all listeners for that event. Used heavily by `Time` (tick loop) and `Viewport` (resize).

### Loader and environment maps

`Loader` is renderer-agnostic and unchanged by the migration. It never mutates the scene; after loading an HDR/EXR/cube texture, apply it explicitly:

```ts
import { applyEnvironmentToScene } from "./engine/Loader";

const tex = await engine.loader.loadHDRAsync({ url: "/env.hdr" });
applyEnvironmentToScene(engine.scene, tex, { setEnvironment: true, setBackground: true });
```

DRACO decoder path is set to `/draco/` — place decoder files in `public/draco/`.

`loadTextureAtlas(urls, options)` packs equally sized images into a `DataArrayTexture`. Like `TextureLoader` it leaves `colorSpace` at `NoColorSpace`; colour artwork must pass `{ colorSpace: THREE.SRGBColorSpace }` or it renders washed out.

### Reproducible randomness

`MATH.random` and `NOISE` are both seeded from `MATH.DEFAULT_SEED`, on separate streams, so results repeat across reloads and consuming one does not shift the other. `MATH.createRandom(seed)` hands out further independent streams — `Emitter` takes one through its `random` parameter.

### HMR behavior

`Experience.ts` uses `import.meta.hot.data` to survive Vite hot reloads without losing the GPU device. Edits to `Experience.ts` rebind the singleton prototype. Edits deeper into `Engine` internals typically require a full page reload. React StrictMode causes a mount → unmount → mount cycle in dev — the engine is created, destroyed, and re-created once; this is expected, and the destroy-before-`ready` path is handled.

### Particles (`src/three/particles/`)

`ParticleSystem` manages a list of `Emitter` + optional `ParticleRenderer` pairs. Call `system.step(time)` each tick. Finished emitters are auto-removed. `EmitterShape` is an interface — `PointShape` is the built-in implementation. The simulation stays on the CPU.

`ParticleRenderer` draws an instanced `THREE.Sprite`, **not** `THREE.Points`: WebGPU only supports one-pixel point primitives, so a point size is silently ignored there. `sprite.count` is the instance count.

It builds its buffers with `THREE.InstancedBufferAttribute` and hands those attribute objects — not raw arrays — to `instancedBufferAttribute()`. Both halves matter: `BufferAttribute` keeps the array by reference where `Float32BufferAttribute` copies it, and TSL only reuses your attribute when it is given the attribute itself (a bare `Float32Array` gets wrapped in a *copy*). Get either wrong and every per-frame write lands in a buffer the GPU never reads.

Because the material has to bind those attributes, `ParticleRendererParams.material` is a **factory**, not a ready-made material:

```ts
new ParticleRenderer({
  parent: scene,
  maxParticles: 1000,
  material: createParticleMaterial({ map, sizeOverLife, colorOverLife, twinkleOverLife }),
  disposeMaterial: true,
});
```

`ParticleMaterial` (`particles/material.ts`) is a `PointsNodeMaterial` carrying the shader as TSL nodes, with uniforms exposed as fields (`uSize`, `uSpinSpeed`, `uLightFactor`, …). The old `uResolution` uniform is gone — three derives the screen scale itself through `sizeAttenuation`. The `*OverLife` ramps still come from `FloatInterpolant.toTexture()` / `ColorInterpolant.toTexture(alpha?)`.

### Post-processing (`src/three/postprocessing/`)

`EffectComposer` and `UnrealBloomPass` are WebGL-only. The replacement is `RenderPipeline` (`PostProcessing` is its deprecated old name) driven by TSL nodes.

`SelectiveBloom` renders the scene **once** into two MRT attachments — the shaded colour and the raw emissive term — then blooms the emissive one and adds it back. Whether something glows is therefore a property of its material, not of the object:

```ts
const material = new THREE.MeshStandardNodeMaterial({ color: 0x000000 });
material.emissive = new THREE.Color(0x00aaff);
material.emissiveIntensity = 4;
```

There is no `toggleBloom`, no layer bookkeeping, no black stand-in materials and no second render. Wiring is two lines instead of three, because both `PassNode` and `BloomNode` resize themselves from the renderer each frame:

```ts
engine.setRenderCallback(() => selectiveBloom.render());
// and selectiveBloom.dispose() from your module's destroy()
```

`dispose()` still has to release three things: `RenderPipeline.dispose()` only frees its own output quad material, while the pass keeps the MRT target and the bloom node keeps its blur chain. Skipping it strands about a dozen render targets per teardown, on every StrictMode cycle and HMR reload.
