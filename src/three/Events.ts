/* eslint-disable @typescript-eslint/no-explicit-any */
type CallbackFunction = (...args: any[]) => void;
type CallbacksStore = {
  [eventName: string]: Array<Array<CallbackFunction>>;
};

export class Events {
  private callbacks: CallbacksStore = {};

  on(eventName: string, callback: CallbackFunction, order: number = 1): this {
    if (!Array.isArray(this.callbacks[eventName])) {
      this.callbacks[eventName] = [];
    }

    if (!Array.isArray(this.callbacks[eventName][order])) {
      this.callbacks[eventName][order] = [];
    }

    this.callbacks[eventName][order].push(callback);
    return this;
  }

  off(eventName: string, callback?: CallbackFunction): this {
    if (!this.callbacks[eventName]) return this;

    if (typeof callback === "function") {
      for (const orderGroup of this.callbacks[eventName]) {
        if (Array.isArray(orderGroup)) {
          const index = orderGroup.indexOf(callback);
          if (index !== -1) {
            orderGroup.splice(index, 1);
          }
        }
      }
    } else {
      delete this.callbacks[eventName];
    }

    return this;
  }

  trigger(eventName: string, ...args: any[]): this {
    const callbacks = this.callbacks[eventName];
    if (!Array.isArray(callbacks)) return this;

    for (const orderGroup of callbacks) {
      if (Array.isArray(orderGroup)) {
        for (const callback of orderGroup) {
          callback.apply(this, args);
        }
      }
    }

    return this;
  }
}
