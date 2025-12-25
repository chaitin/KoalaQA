/**
 * 模拟 API - 获取主题色配置
 * TODO: 替换为真实的 API 调用
 */

export interface ThemeColorResponse {
  primaryColor?: string // RGB 格式，如 "rgb(254, 102, 42)" 或十六进制格式 "#FE662A"
}

/**
 * 模拟获取主题色配置
 * @returns 主题色配置
 */
export async function getThemeColor(): Promise<ThemeColorResponse> {
  // 模拟异步请求延迟
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 模拟返回主题色 rgb(254, 102, 42)
  // 你可以修改这里来测试不同的主题色
  return {
    // primaryColor: '#50A892',
    // primaryColor: '#FE662A', // 橙色主题
    // primaryColor: '#006FFF', // 默认蓝色主题
    // primaryColor: '#EA4C89',
    primaryColor: '#006397',
  }
}

