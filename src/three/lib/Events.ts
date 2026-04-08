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
  private sortedOrders: Record<string, number[]> = {};
  private sortedOrdersDirty: Record<string, boolean> = {};

  public on<K extends keyof T>(
    eventName: K,
    callback: CallbackFunction<T[K]>,
    order: O = 1 as O
  ): this {
    this.callbacks[eventName] ??= {};
    this.callbacks[eventName]![order] ??= [];
    this.callbacks[eventName]![order].push(callback);
    this.sortedOrdersDirty[String(eventName)] = true;
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
      // Callback removal does not necessarily change order keys, but keeps caching safe.
      this.sortedOrdersDirty[String(eventName)] = true;
    } else {
      delete this.callbacks[eventName];
      delete this.sortedOrders[String(eventName)];
      delete this.sortedOrdersDirty[String(eventName)];
    }
    return this;
  }

  public trigger<K extends keyof T>(
    eventName: K,
    ...args: T[K] extends void ? [] : [T[K]]
  ): this {
    const eventCallbacks = this.callbacks[eventName];
    if (!eventCallbacks) return this;

    const cacheKey = String(eventName);
    let orders = this.sortedOrders[cacheKey];
    if (!orders || this.sortedOrdersDirty[cacheKey]) {
      orders = Object.keys(eventCallbacks)
        .map(Number)
        .sort((a, b) => a - b);
      this.sortedOrders[cacheKey] = orders;
      this.sortedOrdersDirty[cacheKey] = false;
    }

    for (const order of orders) {
      const callbacksArray = eventCallbacks[order];
      if (!callbacksArray || callbacksArray.length === 0) continue;
      const snapshot = [...callbacksArray];
      for (const callback of snapshot) (callback as any)(...args);
    }
    return this;
  }
}
