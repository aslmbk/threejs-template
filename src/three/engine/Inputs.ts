import { Events } from "../lib";

type Keys = Record<string, boolean>;

export type KeyEventArgs = {
  event: KeyboardEvent;
  keys: Keys;
};

export type KeysResetEventArgs = {
  keys: Keys;
};

export class Inputs {
  /**
   * Indexed by both `KeyboardEvent.code` (physical key, layout independent —
   * prefer it for controls) and `KeyboardEvent.key` (the character produced,
   * which depends on the active modifiers).
   */
  public readonly keys: Keys = {};

  public readonly events = new Events<{
    keydown: KeyEventArgs;
    keyup: KeyEventArgs;
    reset: KeysResetEventArgs;
  }>();

  /**
   * Every `key` a given physical `code` has produced while held. `key` follows
   * the modifier state, so pressing Shift+A records "A" but releasing A after
   * Shift reports "a" — without this map the "A" entry would stay `true`
   * forever. A code can produce several characters if a modifier is pressed or
   * released mid-hold, hence a set rather than a single value.
   */
  private readonly keysByCode = new Map<string, Set<string>>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    // Focus loss swallows the matching keyup, so anything held at that moment
    // (alt-tab while walking forward) would otherwise stay pressed forever.
    window.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    let produced = this.keysByCode.get(event.code);
    if (!produced) {
      produced = new Set();
      this.keysByCode.set(event.code, produced);
    }
    produced.add(event.key);

    this.keys[event.key] = true;
    this.keys[event.code] = true;
    this.events.trigger("keydown", { event, keys: this.keys });
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const produced = this.keysByCode.get(event.code);
    if (produced) {
      for (const key of produced) {
        this.keys[key] = false;
      }
      this.keysByCode.delete(event.code);
    }

    this.keys[event.key] = false;
    this.keys[event.code] = false;
    this.events.trigger("keyup", { event, keys: this.keys });
  };

  private onBlur = () => {
    this.releaseAll();
  };

  /**
   * Marks every tracked key as released and emits `reset`. Pollers of `keys`
   * need nothing extra; listeners that mirror keydown/keyup into their own
   * state should resubscribe to `reset` to stay in sync.
   */
  public releaseAll() {
    for (const key of Object.keys(this.keys)) {
      this.keys[key] = false;
    }
    this.keysByCode.clear();
    this.events.trigger("reset", { keys: this.keys });
  }

  public destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);

    this.keysByCode.clear();
    this.events.off("keydown");
    this.events.off("keyup");
    this.events.off("reset");
  }
}
