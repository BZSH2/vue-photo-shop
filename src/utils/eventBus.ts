// src/utils/eventBus.ts
import type { Emitter } from 'mitt';
import mitt from 'mitt';

// 定义事件类型
interface TemplateEvents {
  'template-change': TemplateChangeData;
  'template-saved': TemplateSavedData;
  'template-selected': TemplateSelectedData;
  'template-drag-start': TemplateDragData;
  'template-drag-end': TemplateDragData;
  'undo-redo': UndoRedoData;
  'component-added': ComponentEventData;
  'component-removed': ComponentEventData;
  'component-updated': ComponentEventData;
}

// 数据类型定义
interface TemplateChangeData {
  timestamp: Date;
  templateId: string | number;
  templateName?: string;
  changes: Record<string, any>;
  userId?: string;
  source: 'editor' | 'preview' | 'api';
}

interface TemplateSavedData {
  timestamp: Date;
  template: any;
  message: string;
  success: boolean;
}

interface TemplateSelectedData {
  timestamp: Date;
  templateId: string | number;
  templateName: string;
  message: string;
}

interface ComponentEventData {
  timestamp: Date;
  component: {
    id: string;
    type: string;
    name: string;
  };
  position?: { x: number; y: number };
  message: string;
}

interface TemplateDragData {
  timestamp: Date;
  templateId: string | number;
  fromIndex: number;
  toIndex: number;
}

interface UndoRedoData {
  timestamp: Date;
  action: 'undo' | 'redo';
  step: number;
  description: string;
}

// 事件类型枚举
export enum EventType {
  TEMPLATE_CHANGE = 'template-change',
  TEMPLATE_SAVED = 'template-saved',
  TEMPLATE_DELETED = 'template-deleted',
  TEMPLATE_LOADED = 'template-loaded',
  TEMPLATE_PREVIEW = 'template-preview',
  TEMPLATE_SELECTED = 'template-selected',
  TEMPLATE_DRAG_START = 'template-drag-start',
  TEMPLATE_DRAG_END = 'template-drag-end',
  UNDO_REDO = 'undo-redo',
  COMPONENT_ADDED = 'component-added',
  COMPONENT_REMOVED = 'component-removed',
  COMPONENT_UPDATED = 'component-updated',
}

// 事件总线实例
// src/utils/eventBus.ts
const emitter: Emitter<Record<EventType, unknown>> = mitt<Record<EventType, unknown>>();

// 封装的事件总线
const TemplateEventBus = {
  emitter,

  // 发送模板变化事件
  emitTemplateChange(data: Omit<TemplateChangeData, 'timestamp'>) {
    emitter.emit(EventType.TEMPLATE_CHANGE, {
      timestamp: new Date(),
      ...data,
    });
  },

  // 监听事件
  on<K extends keyof TemplateEvents>(type: K, handler: (event: TemplateEvents[K]) => void) {
    emitter.on(type, handler);
    return () => emitter.off(type, handler);
  },

  // 一次性监听
  once<K extends keyof TemplateEvents>(type: K, handler: (event: TemplateEvents[K]) => void) {
    const onceHandler = (event: TemplateEvents[K]) => {
      handler(event);
      emitter.off(type, onceHandler);
    };
    emitter.on(type, onceHandler);
  },

  // 移除监听
  off<K extends keyof TemplateEvents>(type: K, handler?: (event: TemplateEvents[K]) => void) {
    emitter.off(type, handler);
  },

  // 清除所有监听
  clear() {
    emitter.all.clear();
  },
};

export default TemplateEventBus;
