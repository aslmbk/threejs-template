import * as THREE from "three";
import type { Pane } from "tweakpane";
import {
  colorSpaceOptions,
  shadowMapTypeOptions,
  toneMappingOptions,
} from "../lib";

/**
 * Several renderer settings are baked into the compiled shaders. Three notices
 * a `toneMapping` change on its own and re-derives the program, but the shadow
 * map and the output colour space are only read while a program is being built
 * — without this the control moves and nothing happens on screen.
 */
function invalidateMaterials(scene: THREE.Scene) {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;

    if (Array.isArray(material)) {
      for (const entry of material) entry.needsUpdate = true;
    } else {
      material.needsUpdate = true;
    }
  });
}

/** Live controls for the renderer settings that `Config` seeds at startup. */
export function addRendererDebugPane(
  pane: Pane,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
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

  folder
    .addBinding(renderer, "outputColorSpace", {
      label: "output space",
      options: colorSpaceOptions,
    })
    .on("change", () => invalidateMaterials(scene));

  folder
    .addBinding(renderer.shadowMap, "enabled", { label: "shadows" })
    .on("change", () => invalidateMaterials(scene));

  folder
    .addBinding(renderer.shadowMap, "type", {
      label: "shadow filter",
      options: shadowMapTypeOptions,
    })
    .on("change", () => invalidateMaterials(scene));
}
