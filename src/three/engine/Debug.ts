import { Pane } from "tweakpane";

export class Debug {
  private _pane: Pane | null = null;

  constructor(debugEnabled: boolean) {
    if (debugEnabled) {
      this.activate();
    }
  }

  private ensurePane() {
    if (!this._pane) {
      this._pane = new Pane();
      this._pane.hidden = true;
    }
    return this._pane;
  }

  public get pane() {
    return this.ensurePane();
  }

  public get hidden() {
    return this._pane?.hidden ?? true;
  }

  private set hidden(value: boolean) {
    if (value) {
      if (this._pane) this._pane.hidden = true;
      return;
    }
    this.ensurePane().hidden = false;
  }

  public activate() {
    this.hidden = false;
  }

  public deactivate() {
    this.hidden = true;
  }

  public dispose() {
    if (!this._pane) return;
    this._pane.dispose();
    this._pane = null;
  }
}
