/**
 * Customer Service Widget - Minimal Standalone Script
 * 客服助手挂件 - 最小化独立脚本
 * 
 * Usage: <script src="/customer-service-widget.js"></script>
 */

// 导出空对象使其成为模块，以便全局类型声明正常工作
export { }

interface CustomerServiceConfig {
  baseUrl?: string
  iframePath?: string
  position?: 'bottom-right' | 'bottom-left'
  buttonSize?: number
  buttonColor?: string
  buttonHoverColor?: string
  zIndex?: number
}

interface CustomerServiceWidgetAPI {
  version: string
  open: () => void
  close: () => void
}

declare global {
  interface Window {
    CustomerServiceConfig?: CustomerServiceConfig
    CustomerServiceWidget?: CustomerServiceWidgetAPI
  }
}

(function () {
  'use strict'

  // 自动检测脚本所在路径作为 baseUrl
  const getScriptBaseUrl = () => {
    if (typeof document !== 'undefined' && document.currentScript) {
      const src = (document.currentScript as HTMLScriptElement).src
      if (src) {
        try {
          const url = new URL(src)
          // 移除文件名部分，保留协议+主机+目录路径
          return url.origin + url.pathname.substring(0, url.pathname.lastIndexOf('/'))
        } catch (e) {
          // 忽略转换失败
        }
      }
    }
    return window.location.origin
  }

  // 配置项
  const config: Required<CustomerServiceConfig> = {
    // 默认配置，可通过 window.CustomerServiceConfig 覆盖
    // 优先级：配置项 > 脚本所在路径 > 页面 origin
    baseUrl: window.CustomerServiceConfig?.baseUrl || getScriptBaseUrl(),
    iframePath: window.CustomerServiceConfig?.iframePath || '/customer-service',
    position: window.CustomerServiceConfig?.position || 'bottom-right',
    buttonSize: window.CustomerServiceConfig?.buttonSize || 56,
    buttonColor: '#fff',
    buttonHoverColor: '#fff',
    zIndex: window.CustomerServiceConfig?.zIndex || 9999,
  }

  // 样式定义
  const styles = `
    .cs-widget-button {
      position: fixed;
      ${config.position === 'bottom-left' ? 'left' : 'right'}: 24px;
      bottom: 88px;
      min-width: ${config.buttonSize}px;
      max-width: ${config.buttonSize}px;
      height: ${config.buttonSize}px;
      padding: 0;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--cs-primary-color, ${config.buttonColor}) 0%, var(--cs-primary-hover-color, ${config.buttonHoverColor}) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: ${config.zIndex};
      outline: none;
      animation: cs-widget-entrance 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
      overflow: hidden;
      box-sizing: border-box;
    }
    
    .cs-widget-button:hover {
      max-width: 300px;
      padding: 0 24px;
      gap: 12px;
      border-radius: 30px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3);
      filter: brightness(1.1);
      border: 1px solid transparent;
      background: 
        linear-gradient(135deg, var(--cs-primary-color, ${config.buttonColor}) 0%, var(--cs-primary-hover-color, ${config.buttonHoverColor}) 100%) padding-box,
        linear-gradient(90deg, rgba(0, 156, 200, 1), rgba(0, 99, 151, 1)) border-box;
    }
    
    .cs-widget-button:active {
      transform: translateY(-2px) scale(0.98);
    }
    
    .cs-widget-button-icon {
      width: 28px;
      height: 28px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
      transition: transform 0.4s ease;
      flex-shrink: 0;
    }
    
    .cs-widget-button-text {
      background: linear-gradient(0deg, #009CC8 0%, #006397 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: transparent;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0;
      max-width: 0;
      transition: all 0.4s ease;
    }

    .cs-widget-button:hover .cs-widget-button-text {
      opacity: 1;
      max-width: 100px;
    }
    
    .cs-widget-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent;
      display: none;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 24px;
      ${config.position === 'bottom-left' ? 'padding-left' : 'padding-right'}: 100px;
      z-index: ${config.zIndex + 1};
      animation: cs-fade-in 0.2s ease-out;
      pointer-events: none;
    }
    
    .cs-widget-modal.cs-active {
      display: flex;
    }
    
    .cs-widget-modal-content {
      position: relative;
      width: 400px;
      max-width: calc(100vw - 48px);
      height: 600px;
      max-height: calc(100vh - 120px);
      background: 
        linear-gradient(#fff, #fff) padding-box,
        linear-gradient(90deg, rgba(0, 156, 200, 1), rgba(0, 99, 151, 1)) border-box;
      border: 1px solid transparent;
      border-radius: 12px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: cs-slide-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
    }
    
    .cs-widget-close {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: transparent;
      backdrop-filter: blur(8px);
      border-color: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      color: #666;
    }
    
    .cs-widget-close:hover {
      background: white;
      color: #333;
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0,0,0,0.15);
    }
    
    .cs-widget-close svg {
      display: block;
      width: 14px;
      height: 14px;
    }
    
    .cs-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 8px;
    }
    
    @keyframes cs-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes cs-slide-up {
      from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes cs-widget-entrance {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.5);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    @media (max-width: 768px) {
      .cs-widget-modal {
        padding: 0;
      }

      .cs-widget-modal-content {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
      }
      
      .cs-widget-iframe {
        border-radius: 0;
      }
    }
    .cs-widget-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .cs-widget-star {
      position: absolute;
      right: -6px;
      bottom: -3px;
      pointer-events: none;
      z-index: 10;
      transition: all 0.3s ease;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `

  // 创建样式标签
  function injectStyles(): void {
    const styleEl = document.createElement('style')
    styleEl.textContent = styles
    document.head.appendChild(styleEl)
  }

  // 创建 SVG 图标
  function createCloseIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
  }


  // 创建 DOM 元素
  function createWidget(avatarUrl?: string): void {
    const finalAvatarUrl = avatarUrl || `${config.baseUrl}/logo.svg`

    // 创建按钮
    const button = document.createElement('button')
    button.className = 'cs-widget-button'
    button.innerHTML = `
      <span class="cs-widget-button-text">智能客服</span>
      <div class="cs-widget-icon-wrapper">
        <img src="${finalAvatarUrl}" alt="Logo" class="cs-widget-button-icon" />
        <div class="cs-widget-star">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 13 14" fill="none">
            <path d="M6.25708 0.941406L8.03816 5.16631L12.5511 6.55184L8.27117 8.78913L6.96321 13.1665L4.72911 8.94827L0.461914 7.21852L4.54226 5.37257L6.25708 0.941406Z" fill="#009CC8"/>
          </svg>
        </div>
      </div>
    `
    button.setAttribute('aria-label', '打开智能客服')

    // 创建模态框
    const modal = document.createElement('div')
    modal.className = 'cs-widget-modal'
    modal.innerHTML = `
      <div class="cs-widget-modal-content">
        <button class="cs-widget-close" aria-label="关闭">${createCloseIcon()}</button>
        <iframe class="cs-widget-iframe" src="${config.baseUrl}${config.iframePath}?is_widget=1" title="客服助手"></iframe>
      </div>
    `

    // 添加到 DOM
    document.body.appendChild(button)
    document.body.appendChild(modal)

    // 绑定事件
    const closeBtn = modal.querySelector('.cs-widget-close') as HTMLButtonElement

    button.addEventListener('click', () => {
      if (modal.classList.contains('cs-active')) {
        modal.classList.remove('cs-active')
      } else {
        modal.classList.add('cs-active')
      }
    })

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('cs-active')
      })
    }

    // ESC 键关闭
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.classList.contains('cs-active')) {
        modal.classList.remove('cs-active')
      }
    })

    // 监听来自 iframe 的关闭消息
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CLOSE_WIDGET') {
        modal.classList.remove('cs-active')
      }
    })
  }

  // 初始化
  async function init(): Promise<void> {
    // 如果页面被 iframe 嵌套，不显示挂件（避免重复显示）
    if (window.self !== window.top) {
      return
    }

    // 检查服务端配置是否启用网页挂件
    let avatarUrl = ''

    try {
      // 避免阻塞，设置一个较短的超时
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const [pluginResponse, botResponse] = await Promise.all([
        fetch(`${config.baseUrl}/api/system/web_plugin`, { signal: controller.signal }),
        fetch(`${config.baseUrl}/api/bot`, { signal: controller.signal })
      ])
      clearTimeout(timeoutId)

      if (pluginResponse.ok) {
        const res = await pluginResponse.json()

        // 检查当前页面的 origin 是否与挂件服务的 origin 一致
        const currentOrigin = window.location.origin
        const widgetOrigin = new URL(config.baseUrl).origin
        const isSameOrigin = currentOrigin === widgetOrigin
        if (res?.data?.plugin === false) {
          return
        }
        // 同源：检查 display
        if (isSameOrigin && res?.data?.display === false) {
          return
        }
      }

      if (botResponse.ok) {
        const res = await botResponse.json()
        if (res?.data?.avatar) {
          const avatar = res.data.avatar
          if (avatar.startsWith('http') || avatar.startsWith('//')) {
            avatarUrl = avatar
          } else {
            const base = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl
            const path = avatar.startsWith('/') ? avatar.substring(1) : avatar
            avatarUrl = `${base}/${path}`
          }
        }
      }
    } catch (error) {
      // 获取配置失败时（如网络错误），默认继续加载，以免影响正常使用
      console.warn('Failed to check widget status:', error)
    }

    // 注入基础样式并创建挂件
    const setup = () => {
      injectStyles()
      createWidget(avatarUrl)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup)
    } else {
      setup()
    }
  }

  // 启动
  init()

  // 暴露全局 API（可选）
  window.CustomerServiceWidget = {
    version: '1.0.0',
    open: () => {
      const modal = document.querySelector('.cs-widget-modal')
      if (modal) {
        modal.classList.add('cs-active')
      }
    },
    close: () => {
      const modal = document.querySelector('.cs-widget-modal')
      if (modal) {
        modal.classList.remove('cs-active')
      }
    },
  }
})()
