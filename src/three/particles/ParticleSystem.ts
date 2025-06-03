import { Emitter } from "./Emitter";
import { Time } from "./types";

export class ParticleSystem {
  private readonly emitters: Emitter[] = [];

  public addEmitter(emitter: Emitter) {
    this.emitters.push(emitter);
  }

  public removeEmitter(emitter: Emitter) {
    const index = this.emitters.indexOf(emitter);
    if (index !== -1) {
      this.emitters.splice(index, 1);
    }
  }

  public step(time: Time) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const emitter = this.emitters[i];
      if (emitter.isActive) {
        emitter.step(time);
      } else {
        emitter.dispose();
        this.removeEmitter(emitter);
      }
    }
  }
}
