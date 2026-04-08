import { Events } from "../lib";

export type CursorEventArgs = {
  x: number;
  y: number;
  event: MouseEvent;
};

export class Cursor {
  public x = Infinity;
  public y = Infinity;
  public readonly events = new Events<{
    move: CursorEventArgs;
    down: CursorEventArgs;
    up: CursorEventArgs;
    click: CursorEventArgs;
  }>();

  private domElement: HTMLElement;
  private bounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  };
  private boundsDirty = true;
  private boundsRafId: number | null = null;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;
    this.refreshBounds();

    domElement.addEventListener("mousemove", this.onPointerMove);
    domElement.addEventListener("mousedown", this.onPointerDown);
    domElement.addEventListener("mouseup", this.onPointerUp);
    domElement.addEventListener("click", this.onClick);

    window.addEventListener("scroll", this.scheduleBoundsRefresh, true);
    window.addEventListener("resize", this.scheduleBoundsRefresh);
  }

  public resize() {
    this.refreshBounds();
  }

  private scheduleBoundsRefresh = () => {
    this.boundsDirty = true;
    if (this.boundsRafId !== null) return;
    this.boundsRafId = requestAnimationFrame(() => {
      this.boundsRafId = null;
      this.refreshBounds();
    });
  };

  private refreshBounds() {
    const rect = this.domElement.getBoundingClientRect();
    this.bounds.left = rect.left;
    this.bounds.top = rect.top;
    this.bounds.width = rect.width;
    this.bounds.height = rect.height;
    this.boundsDirty = false;
  }

  private updateFromEvent(event: MouseEvent): boolean {
    if (this.boundsDirty) {
      this.refreshBounds();
    }

    if (this.bounds.width === 0 || this.bounds.height === 0) return false;

    const localX = event.clientX - this.bounds.left;
    const localY = event.clientY - this.bounds.top;

    this.x = (localX / this.bounds.width) * 2 - 1;
    this.y = -((localY / this.bounds.height) * 2 - 1);
    return true;
  }

  private onPointerMove = (event: MouseEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("move", { x: this.x, y: this.y, event });
  };

  private onPointerDown = (event: MouseEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("down", { x: this.x, y: this.y, event });
  };

  private onPointerUp = (event: MouseEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("up", { x: this.x, y: this.y, event });
  };

  private onClick = (event: MouseEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("click", { x: this.x, y: this.y, event });
  };

  public destroy() {
    this.domElement.removeEventListener("mousemove", this.onPointerMove);
    this.domElement.removeEventListener("mousedown", this.onPointerDown);
    this.domElement.removeEventListener("mouseup", this.onPointerUp);
    this.domElement.removeEventListener("click", this.onClick);

    window.removeEventListener("scroll", this.scheduleBoundsRefresh, true);
    window.removeEventListener("resize", this.scheduleBoundsRefresh);
    if (this.boundsRafId !== null) {
      cancelAnimationFrame(this.boundsRafId);
      this.boundsRafId = null;
    }

    this.events.off("move");
    this.events.off("down");
    this.events.off("up");
    this.events.off("click");
  }
}
