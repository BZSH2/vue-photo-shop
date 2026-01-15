// src/utils/eventBus.ts
import type { Emitter } from 'mitt';
import mitt from 'mitt';

// 定义事件类型
interface TemplateEvents {
  'template-change': TemplateChangeData;
  'template-saved': TemplateSavedData;
  'template-deleted': TemplateDeletedData;
  'template-loaded': TemplateLoadedData;
  'template-preview': TemplatePreviewData;
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
const emitter: Emitter<TemplateEvents> = mitt<TemplateEvents>();

// 封装的事件总线
const TemplateEventBus = {
  emitter,

  // 发送模板变化事件
  emitTemplateChange(data: Omit<TemplateChangeData, 'timestamp'>) {
    emitter.emit('template-change', {
      timestamp: new Date(),
      ...data,
    });
  },

  // 发送模板保存事件
  emitTemplateSaved(template: any, success: boolean = true) {
    emitter.emit('template-saved', {
      timestamp: new Date(),
      template,
      message: success ? '模板已保存成功' : '模板保存失败',
      success,
    });
  },

  // 发送模板选择事件
  emitTemplateSelected(templateId: string | number, templateName: string) {
    emitter.emit('template-selected', {
      timestamp: new Date(),
      templateId,
      templateName,
      message: '模板已选择',
    });
  },

  // 发送组件事件
  emitComponentAdded(component: ComponentEventData['component'], position?: { x: number; y: number }) {
    emitter.emit('component-added', {
      timestamp: new Date(),
      component,
      position,
      message: '组件已添加',
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
