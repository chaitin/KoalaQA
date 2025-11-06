/**
 * 浏览器通知工具函数
 * 用于管理浏览器原生通知功能
 */

/**
 * 检查浏览器是否支持通知 API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * 获取当前通知权限状态
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) {
    return null
  }
  return Notification.permission
}

/**
 * 请求通知权限
 * @returns Promise<boolean> 是否获得权限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('浏览器不支持通知功能')
    return false
  }

  // 如果已经授予权限，直接返回 true
  if (Notification.permission === 'granted') {
    console.log('通知权限已授予')
    return true
  }

  // 如果权限被拒绝，无法再次请求
  if (Notification.permission === 'denied') {
    console.warn('通知权限已被拒绝，无法再次请求')
    return false
  }

  // 请求权限
  try {
    console.log('正在请求通知权限...')
    const permission = await Notification.requestPermission()
    console.log('通知权限请求结果:', permission)
    return permission === 'granted'
  } catch (error) {
    console.error('请求通知权限失败:', error)
    return false
  }
}

/**
 * 显示浏览器通知
 * @param title 通知标题
 * @param options 通知选项
 * @returns Notification | null
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationSupported()) {
    console.warn('浏览器不支持通知功能')
    return null
  }

  if (Notification.permission !== 'granted') {
    console.warn('通知权限未授予，当前权限状态:', Notification.permission)
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico', // 默认图标
      badge: '/favicon.ico',
      ...options,
    })

    console.log('浏览器通知已显示:', notification)

    // 注意：onclick 会在外部设置，这里不设置默认的 onclick
    // 自动关闭通知（5秒后）
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  } catch (error) {
    console.error('显示通知失败:', error)
    return null
  }
}

/**
 * 格式化通知内容
 * @param notification 通知信息
 * @returns 通知标题和选项
 */
export interface NotificationData {
  title: string
  options: NotificationOptions
}

export function formatNotificationData(
  notification: {
    from_name?: string
    discuss_title?: string
    discuss_uuid?: string
    forum_id?: number
    type?: number
  },
  notificationText: string
): NotificationData {
  const title = notification.from_name || '未知用户'
  const body = `${notificationText} - ${notification.discuss_title || '无标题'}`
  
  // 构建点击通知后跳转的 URL
  const url = notification.discuss_uuid && notification.forum_id
    ? `${window.location.origin}/${notification.forum_id}/${notification.discuss_uuid}`
    : window.location.origin

  return {
    title,
    options: {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `notification-${notification.discuss_uuid || Date.now()}`, // 使用 tag 避免重复通知
      data: {
        url,
        discuss_uuid: notification.discuss_uuid,
        forum_id: notification.forum_id,
      },
    },
  }
}

