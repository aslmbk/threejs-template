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
  private sizes = {
    width: 0,
    height: 0,
  };

  constructor(domElement: HTMLElement, width: number, height: number) {
    this.domElement = domElement;
    this.sizes.width = width;
    this.sizes.height = height;

    domElement.addEventListener("mousemove", this.onPointerMove);
    domElement.addEventListener("mousedown", this.onPointerDown);
    domElement.addEventListener("mouseup", this.onPointerUp);
    domElement.addEventListener("click", this.onClick);
  }

  public resize(width: number, height: number) {
    this.sizes.width = width;
    this.sizes.height = height;
  }

  private onPointerMove = (event: MouseEvent) => {
    // Avoid NaN/Infinity when the container is not yet measurable.
    if (this.sizes.width === 0 || this.sizes.height === 0) return;

    this.x = event.clientX / this.sizes.width - 0.5;
    this.y = -(event.clientY / this.sizes.height - 0.5);
    this.events.trigger("move", { x: this.x, y: this.y, event });
  };

  private onPointerDown = (event: MouseEvent) => {
    this.events.trigger("down", { x: this.x, y: this.y, event });
  };

  private onPointerUp = (event: MouseEvent) => {
    this.events.trigger("up", { x: this.x, y: this.y, event });
  };

  private onClick = (event: MouseEvent) => {
    this.events.trigger("click", { x: this.x, y: this.y, event });
  };

  public destroy() {
    this.domElement.removeEventListener("mousemove", this.onPointerMove);
    this.domElement.removeEventListener("mousedown", this.onPointerDown);
    this.domElement.removeEventListener("mouseup", this.onPointerUp);
    this.domElement.removeEventListener("click", this.onClick);

    this.events.off("move");
    this.events.off("down");
    this.events.off("up");
    this.events.off("click");
  }
}
