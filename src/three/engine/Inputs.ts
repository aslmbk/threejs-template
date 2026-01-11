import { Events } from "../lib";

type Keys = Record<string, boolean>;
export type KeyEventArgs = {
  event: KeyboardEvent;
  keys: Keys;
};

export class Inputs {
  public readonly keys: Keys = {};
  public readonly events = new Events<{
    keydown: KeyEventArgs;
    keyup: KeyEventArgs;
  }>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    this.keys[event.key] = true;
    this.keys[event.code] = true;
    this.events.trigger("keydown", { event, keys: this.keys });
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys[event.key] = false;
    this.keys[event.code] = false;
    this.events.trigger("keyup", { event, keys: this.keys });
  };

  public destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);

    this.events.off("keydown");
    this.events.off("keyup");
  }
}
