import type * as THREE from "three/webgpu";
import type { Pane } from "tweakpane";
import {
  colorSpaceOptions,
  shadowMapTypeOptions,
  toneMappingOptions,
} from "../lib";

/**
 * Live controls for the renderer settings that `Config` seeds at startup.
 *
 * Unlike the WebGL renderer, nothing here needs a manual material invalidation:
 * `shadowMap.enabled` and `shadowMap.type` are part of the per-draw cache key in
 * `NodeManager.getCacheKey()`, and `toneMapping` / `outputColorSpace` are keyed
 * by `getOutputCacheKey()`, which rebuilds the output pass on its own.
 */
export function addRendererDebugPane(
  pane: Pane,
  renderer: THREE.WebGPURenderer,
): void {
  const folder = pane.addFolder({ title: "Renderer", expanded: false });

  folder.addBinding(renderer, "toneMapping", {
    label: "tone mapping",
    options: toneMappingOptions,
  });
  folder.addBinding(renderer, "toneMappingExposure", {
    label: "exposure",
    min: 0,
    max: 4,
    step: 0.01,
  });
  folder.addBinding(renderer, "outputColorSpace", {
    label: "output space",
    options: colorSpaceOptions,
  });
  folder.addBinding(renderer.shadowMap, "enabled", { label: "shadows" });
  folder.addBinding(renderer.shadowMap, "type", {
    label: "shadow filter",
    options: shadowMapTypeOptions,
  });
}

/**
 * Read-outs from `renderer.info`. The draw counters are per frame — the
 * renderer's own animation loop resets them before each one — while the memory
 * figures are running totals, which makes them the quickest way to spot a
 * resource leak across a teardown.
 */
export function addInfoDebugPane(
  pane: Pane,
  renderer: THREE.WebGPURenderer,
): void {
  const folder = pane.addFolder({ title: "Info", expanded: false });
  const { render, memory } = renderer.info;

  folder.addBinding(render, "drawCalls", {
    readonly: true,
    label: "draw calls",
  });
  folder.addBinding(render, "triangles", { readonly: true });
  folder.addBinding(memory, "geometries", { readonly: true });
  folder.addBinding(memory, "textures", { readonly: true });
  folder.addBinding(memory, "renderTargets", {
    readonly: true,
    label: "render targets",
  });
  folder.addBinding(memory, "programs", { readonly: true });
}
