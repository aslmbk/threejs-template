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

    const particlesFolder = experience.debug.addFolder({
      title: "particles",
      expanded: true,
    });

    particlesFolder
      .addBinding(experience.config, "uSize")
      .on("change", ({ value }) => {
        experience.particles.changeParticlesSize(value);
      });
  }
}
