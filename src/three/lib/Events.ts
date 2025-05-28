/* eslint-disable @typescript-eslint/no-explicit-any */

type EventMap = {
  [key: string]: any;
};

type CallbackFunction<Args> = Args extends void
  ? () => void
  : (args: Args) => void;

type CallbacksStore<T extends EventMap> = {
  [K in keyof T]?: Record<number, CallbackFunction<T[K]>[]>;
};

export class Events<T extends EventMap, O extends number = 1 | 2 | 3 | 4 | 5> {
  private callbacks: CallbacksStore<T> = {};

  public on<K extends keyof T>(
    eventName: K,
    callback: CallbackFunction<T[K]>,
    order: O = 1 as O
  ): this {
    this.callbacks[eventName] ??= {};
    this.callbacks[eventName]![order] ??= [];
    this.callbacks[eventName]![order].push(callback);
    return this;
  }

  public off<K extends keyof T>(
    eventName: K,
    callback?: CallbackFunction<T[K]>
  ): this {
    const eventCallbacks = this.callbacks[eventName];
    if (!eventCallbacks) return this;

    if (callback) {
      Object.values(eventCallbacks).forEach((callbacksArray) => {
        const index = callbacksArray.indexOf(callback as any);
        if (index !== -1) {
          callbacksArray.splice(index, 1);
        }
      });
    } else {
      delete this.callbacks[eventName];
    }
    return this;
  }

  public trigger<K extends keyof T>(
    eventName: K,
    ...args: T[K] extends void ? [] : [T[K]]
  ): this {
    const eventCallbacks = this.callbacks[eventName];
    if (!eventCallbacks) return this;

    const orders = Object.keys(eventCallbacks)
      .map(Number)
      .sort((a, b) => a - b);

    for (const order of orders) {
      const callbacksArray = eventCallbacks[order];
      callbacksArray.forEach((callback) => (callback as any)(...args));
    }
    return this;
  }
}
