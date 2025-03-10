import { Experience } from "./Experience";

export class DebugController {
  constructor(experience: Experience) {
    experience.renderer.setClearColor(experience.config.clearColor);

    const rendererFolder = experience.debug.addFolder({
      title: "renderer",
      expanded: true,
    });

    rendererFolder
      .addBinding(experience.config, "clearColor")
      .on("change", ({ value }) => {
        experience.renderer.setClearColor(value);
      });
  }
}
