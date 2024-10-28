import { isFunction, isNumber, } from "lodash";
import { isStringNumber } from "./utils/utils";



export class Listener<T extends any> {

  constructor() { }

  event = {} as Record<keyof T, Array<{ cb: (param: any) => void, callstamp: number }>>;

  once<K extends keyof T>(type: K, cb: (param: T[K]) => void) {
    const _e = this.event[type] ?? [];
    if (cb && _e.find(({ cb: _cb }) => cb === _cb)) {
      return;
    }
    else {
      this.on(type, cb);
    }
  }

  on<K extends keyof T>(type: K, cb: (param: T[K]) => void) {
    const _e = this.event[type] ?? [];
    _e.push({ cb, callstamp: 0 });
    this.event[type] = _e;
  }

  exec<K extends keyof T>(type: K, interval: number | null, param: T[K]) {
    (this.event[type] ?? []).forEach((event) => {
      const { callstamp, cb } = event;
      const current = Date.now();
      if ((isNumber(interval) || isStringNumber(interval))) {
        if (Date.now() - callstamp >= (interval as number))
          cb(param), event.callstamp = current;
      }
      else {
        cb(param), event.callstamp = current;
      }
    });
  }

  dispatch<K extends keyof T>(type: K, interval: number | null, param: T[K]) {
    (this.event[type] ?? []).forEach((event) => {
      const { callstamp, cb } = event;
      const current = Date.now();
      if ((isNumber(interval) || isStringNumber(interval))) {
        if (Date.now() - callstamp >= (interval as number))
          cb(param), event.callstamp = current;
      }
      else {
        cb(param), event.callstamp = current;
      }
    });
  }

  off<K extends keyof T>(type: K, cb?: (param: T[K]) => void) {
    const _e = this.event[type] ?? [];
    if (cb && _e.find(({ cb: _cb }) => cb === _cb)) {
      _e.splice(_e.findIndex(e => e.cb === cb), 1);
      this.event[type] = _e;
    }
    if (!cb && !isFunction(cb)) this.event[type] = [];
  }
}