import { Events } from "../lib";

/**
 * `x`/`y` are normalized device coordinates, ready to hand to `Rays`.
 * `click` is a plain MouseEvent; every other event carries the PointerEvent.
 */
export type CursorEventArgs<E extends MouseEvent = PointerEvent> = {
  x: number;
  y: number;
  event: E;
};

export class Cursor {
  public x = Infinity;
  public y = Infinity;
  public readonly events = new Events<{
    move: CursorEventArgs;
    down: CursorEventArgs;
    up: CursorEventArgs;
    click: CursorEventArgs<MouseEvent>;
  }>();

  private readonly domElement: HTMLElement;
  private readonly bounds = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  };
  private boundsDirty = true;

  constructor(domElement: HTMLElement) {
    this.domElement = domElement;

    // Pointer events cover mouse, touch and pen with one code path. Plain mouse
    // events are only synthesized for taps, so a touch drag would never move the
    // cursor; `pointercancel` stands in for the `pointerup` the browser swallows
    // when it takes the gesture over.
    domElement.addEventListener("pointermove", this.onPointerMove);
    domElement.addEventListener("pointerdown", this.onPointerDown);
    domElement.addEventListener("pointerup", this.onPointerUp);
    domElement.addEventListener("pointercancel", this.onPointerUp);
    domElement.addEventListener("click", this.onClick);

    // Bounds only change through layout. Invalidating is free, so these can
    // overlap with Engine's viewport-driven resize() without doing double work,
    // and the rect is read lazily on the next pointer event instead of forcing
    // a reflow from inside a resize or scroll handler.
    window.addEventListener("scroll", this.invalidateBounds, true);
    window.addEventListener("resize", this.invalidateBounds);
  }

  /** Marks the cached bounds stale; Engine calls this on every viewport change. */
  public resize() {
    this.boundsDirty = true;
  }

  private invalidateBounds = () => {
    this.boundsDirty = true;
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

  private onPointerMove = (event: PointerEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("move", { x: this.x, y: this.y, event });
  };

  private onPointerDown = (event: PointerEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("down", { x: this.x, y: this.y, event });
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("up", { x: this.x, y: this.y, event });
  };

  private onClick = (event: MouseEvent) => {
    if (!this.updateFromEvent(event)) return;
    this.events.trigger("click", { x: this.x, y: this.y, event });
  };

  public destroy() {
    this.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.domElement.removeEventListener("pointercancel", this.onPointerUp);
    this.domElement.removeEventListener("click", this.onClick);

    window.removeEventListener("scroll", this.invalidateBounds, true);
    window.removeEventListener("resize", this.invalidateBounds);

    this.events.off("move");
    this.events.off("down");
    this.events.off("up");
    this.events.off("click");
  }
}
