import { Pane } from "tweakpane";

export class Debug extends Pane {
  constructor() {
    super();
    this.hidden = !this.isDebugMode;
  }

  private get isDebugMode() {
    return location.hash.indexOf("debug") !== -1;
  }

  public activate() {
    this.hidden = false;
  }

  public deactivate() {
    this.hidden = true;
  }
}
