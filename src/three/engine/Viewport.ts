import { Events } from "../lib";

export type ViewportEventArgs = {
  width: number;
  height: number;
  ratio: number;
  pixelRatio: number;
};

export type ViewportOptions = {
  maxPixelRatio?: number;
};

export class Viewport {
  private domElement: HTMLElement;
  private readonly maxPixelRatio: number;
  public width = 0;
  public height = 0;
  public ratio = 0;
  public pixelRatio = 0;
  public readonly events = new Events<{
    change: ViewportEventArgs;
  }>();
  private resizeObserver: ResizeObserver | null = null;
  private resizeRafId: number | null = null;

  constructor(domElement: HTMLElement, options?: ViewportOptions) {
    this.maxPixelRatio = options?.maxPixelRatio ?? 2;
    this.domElement = domElement;
    this.measure();

    this.resizeObserver = new ResizeObserver(() => this.scheduleResize());
    this.resizeObserver.observe(this.domElement);
  }

  private measure() {
    this.width = this.domElement.clientWidth;
    this.height = this.domElement.clientHeight;
    this.ratio = this.height === 0 ? 1 : this.width / this.height;
    this.pixelRatio = Math.min(window.devicePixelRatio, this.maxPixelRatio);
  }

  private scheduleResize = () => {
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      this.onResize();
    });
  };

  private onResize() {
    this.measure();
    this.events.trigger("change", {
      width: this.width,
      height: this.height,
      ratio: this.ratio,
      pixelRatio: this.pixelRatio,
    });
  }

  public refresh() {
    this.onResize();
  }

  public destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    this.events.off("change");
  }
}
