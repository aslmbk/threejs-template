import { Emitter } from "./Emitter";
import type { ParticleRenderer } from "./ParticleRenderer";
import { type Time } from "./types";

export type ParticleSystemEntry = {
  emitter: Emitter;
  renderer?: ParticleRenderer;
  disposeRenderer?: boolean;
};

export class ParticleSystem {
  private readonly entries: ParticleSystemEntry[] = [];

  public addEmitter(
    emitter: Emitter,
    renderer?: ParticleRenderer,
    options?: { disposeRenderer?: boolean }
  ) {
    this.entries.push({
      emitter,
      renderer,
      disposeRenderer: options?.disposeRenderer ?? false,
    });
  }

  private removeEntryAt(index: number) {
    const entry = this.entries[index];

    entry.renderer?.updateFromParticles([]);

    entry.emitter.dispose();
    if (entry.disposeRenderer) {
      entry.renderer?.dispose();
    }

    const lastIndex = this.entries.length - 1;
    if (index !== lastIndex) {
      this.entries[index] = this.entries[lastIndex];
    }
    this.entries.pop();
  }

  public removeEmitter(emitter: Emitter) {
    const index = this.entries.findIndex((e) => e.emitter === emitter);
    if (index !== -1) this.removeEntryAt(index);
  }

  public step(time: Time) {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];

      entry.emitter.step(time);
      entry.renderer?.updateFromParticles(entry.emitter.particles);

      if (!entry.emitter.isActive) {
        this.removeEntryAt(i);
      }
    }
  }

  public dispose() {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      this.removeEntryAt(i);
    }
  }
}
