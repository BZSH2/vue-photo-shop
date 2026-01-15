// src/types/events.ts
// 定义应用事件类型
export interface AppEvents {
  // 用户相关
  'user:login': { id: number; name: string };
  'user:logout': { id: number };

  // UI相关
  'modal:open': { id: string; props?: any };
  'modal:close': { id: string };
  'toast:show': { message: string; type: 'success' | 'error' | 'info' };

  // 数据相关
  'data:updated': { type: string; data: any };
  'data:loading': { loading: boolean };

  // 路由相关
  'route:changed': { from: string; to: string };

  // 网络相关
  'network:online': void;
  'network:offline': void;

  // 自定义事件
  [key: string]: any;
}

// 事件类型
export type AppEvent = keyof AppEvents;
