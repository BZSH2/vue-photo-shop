// hooks/useEventBus.ts
import type { Emitter, EventType, Handler } from 'mitt';
import mitt from 'mitt';
import { onUnmounted } from 'vue';

// 事件类型定义
type Events = Record<EventType, unknown>;

// 创建全局事件总线实例
const emitter: Emitter<Events> = mitt<Events>();

export function useEventBus(): {
  on: (type: EventType, handler: Handler<unknown>) => void;
  emit: (type: EventType, event?: unknown) => void;
  off: (type: EventType, handler: Handler<unknown>) => void;
  clear: () => void;
} {
  // 存储事件处理函数，便于组件卸载时清理
  const eventHandlers: Array<{ type: EventType; handler: Handler<unknown> }> = [];

  /**
   * 监听事件
   * @param type 事件类型
   * @param handler 事件处理函数
   */
  const on = (type: EventType, handler: Handler<unknown>): void => {
    emitter.on(type, handler);
    eventHandlers.push({ type, handler });
  };

  /**
   * 触发事件
   * @param type 事件类型
   * @param event 事件数据
   */
  const emit = (type: EventType, event?: unknown): void => {
    emitter.emit(type, event);
  };

  /**
   * 移除事件监听
   * @param type 事件类型
   * @param handler 事件处理函数
   */
  const off = (type: EventType, handler: Handler<unknown>): void => {
    emitter.off(type, handler);
    const index = eventHandlers.findIndex(
      item => item.type === type && item.handler === handler,
    );
    if (index > -1) {
      eventHandlers.splice(index, 1);
    }
  };

  /**
   * 清理所有监听
   */
  const clear = (): void => {
    eventHandlers.forEach(({ type, handler }) => {
      emitter.off(type, handler);
    });
    eventHandlers.length = 0;
  };

  // 组件卸载时自动清理监听
  onUnmounted(() => {
    clear();
  });

  return {
    on,
    emit,
    off,
    clear,
  };
}

// 如果需要，也可以导出 emitter 实例供全局使用
export { emitter };
