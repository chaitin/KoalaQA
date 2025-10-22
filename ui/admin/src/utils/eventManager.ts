/**
 * 简单的事件管理器，用于组件间通信
 */
class EventManager {
  private events: { [key: string]: Function[] } = {};

  /**
   * 监听事件
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  on(eventName: string, callback: Function) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  /**
   * 移除事件监听
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  off(eventName: string, callback: Function) {
    if (!this.events[eventName]) return;
    
    const index = this.events[eventName].indexOf(callback);
    if (index > -1) {
      this.events[eventName].splice(index, 1);
    }
  }

  /**
   * 触发事件
   * @param eventName 事件名称
   * @param data 事件数据
   */
  emit(eventName: string, data?: any) {
    if (!this.events[eventName]) return;
    
    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }

  /**
   * 移除所有事件监听
   */
  removeAllListeners() {
    this.events = {};
  }
}

// 创建全局事件管理器实例
export const eventManager = new EventManager();

// 定义事件名称常量
export const EVENTS = {
  CATEGORY_UPDATED: 'category_updated',
  FORUM_UPDATED: 'forum_updated',
} as const;
