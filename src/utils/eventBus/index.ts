// src/libs/eventBus.ts
import type { EventType, Handler } from 'mitt';
import mitt, { Emitter } from 'mitt';

// 创建事件总线实例
const emitter = mitt();

// 类型定义
type EventHandler<T = any> = (data: T) => void;
type Unsubscribe = () => void;

// 事件总线接口
interface IEventBus {
  on: <T = any>(event: EventType, handler: EventHandler<T>) => Unsubscribe;
  once: <T = any>(event: EventType, handler: EventHandler<T>) => Unsubscribe;
  emit: <T = any>(event: EventType, data?: T) => void;
  off: <T = any>(event: EventType, handler?: EventHandler<T>) => void;
  clear: () => void;
  all: Map<EventType, Handler[]>;
}

// 事件总线实现
export const eventBus: IEventBus = {
  emitter,

  on<T = any>(event: EventType, handler: EventHandler<T>): Unsubscribe {
    emitter.on(event, handler as Handler);
    return () => emitter.off(event, handler as Handler);
  },

  once<T = any>(event: EventType, handler: EventHandler<T>): Unsubscribe {
    const onceHandler: Handler = (data: T) => {
      handler(data);
      emitter.off(event, onceHandler);
    };
    emitter.on(event, onceHandler);
    return () => emitter.off(event, onceHandler);
  },

  emit<T = any>(event: EventType, data?: T): void {
    emitter.emit(event, data);
  },

  off<T = any>(event: EventType, handler?: EventHandler<T>): void {
    emitter.off(event, handler as Handler);
  },

  clear(): void {
    emitter.all.clear();
  },

  all: emitter.all,
};

export default eventBus;
