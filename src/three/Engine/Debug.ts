import { Pane } from "tweakpane";

export class Debug {
  public panel: Pane;

  constructor() {
    const active = location.hash.indexOf("debug") !== -1;
    this.panel = new Pane();
    this.panel.hidden = !active;
  }

  public dispose() {
    if (!import.meta.env.DEV) {
      this.panel.dispose();
    }
  }
}
