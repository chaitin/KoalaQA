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
      bottom: 24px;
      min-width: 48px;
      padding: 16px 8px;
      border-radius: 30px;
      background: linear-gradient(135deg, var(--cs-primary-color, ${config.buttonColor}) 0%, var(--cs-primary-hover-color, ${config.buttonHoverColor}) 100%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: ${config.zIndex};
      outline: none;
      animation: cs-widget-entrance 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
    }
    
    .cs-widget-button:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3);
      filter: brightness(1.1);
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
    }

    .cs-widget-button:hover .cs-widget-button-icon {
      transform: rotate(10deg) scale(1.1);
    }
    
    .cs-widget-button-text {
      color: #333;
      font-size: 14px;
      font-weight: 600;
      writing-mode: vertical-rl;
      text-orientation: upright;
      letter-spacing: 2px;
      line-height: 1.2;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .cs-widget-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.2);
      display: none;
      align-items: flex-end;
      justify-content: flex-end;
      padding: 24px;
      z-index: ${config.zIndex + 1};
      animation: cs-fade-in 0.2s ease-out;
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
      background: white;
      border-radius: 20px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: cs-slide-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    .cs-widget-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 0, 0, 0.05);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      outline: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .cs-widget-close:hover {
      background: white;
      transform: rotate(90deg) scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.15);
    }
    
    .cs-widget-close svg {
      width: 20px;
      height: 20px;
      fill: #666;
    }
    
    .cs-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
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
  `

  // 创建样式标签
  function injectStyles(): void {
    const styleEl = document.createElement('style')
    styleEl.textContent = styles
    document.head.appendChild(styleEl)
  }

  // 创建 SVG 图标
  function createCloseIcon(): string {
    return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>'
  }

  // 辅助函数：根据主题色计算悬停颜色（变暗 10%）
  function getHoverColor(hex: string): string {
    // 简单的颜色变暗逻辑
    if (!hex.startsWith('#')) return hex
    let r = parseInt(hex.slice(1, 3), 16)
    let g = parseInt(hex.slice(3, 5), 16)
    let b = parseInt(hex.slice(5, 7), 16)
    r = Math.floor(r * 0.9)
    g = Math.floor(g * 0.9)
    b = Math.floor(b * 0.9)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  // 创建 DOM 元素
  function createWidget(): void {
    // 创建按钮
    const button = document.createElement('button')
    button.className = 'cs-widget-button'
    button.innerHTML = `
      <img src="${config.baseUrl}/logo.svg" alt="Logo" class="cs-widget-button-icon" />
      <span class="cs-widget-button-text">智能客服</span>
    `
    button.setAttribute('aria-label', '打开智能客服')

    // 创建模态框
    const modal = document.createElement('div')
    modal.className = 'cs-widget-modal'
    modal.innerHTML = `
      <div class="cs-widget-modal-content">
        <button class="cs-widget-close" aria-label="关闭">${createCloseIcon()}</button>
        <iframe class="cs-widget-iframe" src="${config.baseUrl}${config.iframePath}" title="客服助手"></iframe>
      </div>
    `

    // 添加到 DOM
    document.body.appendChild(button)
    document.body.appendChild(modal)

    // 绑定事件
    const closeBtn = modal.querySelector('.cs-widget-close') as HTMLButtonElement

    button.addEventListener('click', () => {
      modal.classList.add('cs-active')
      document.body.style.overflow = 'hidden'
    })

    closeBtn.addEventListener('click', () => {
      modal.classList.remove('cs-active')
      document.body.style.overflow = ''
    })

    // 点击背景关闭
    modal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modal) {
        modal.classList.remove('cs-active')
        document.body.style.overflow = ''
      }
    })

    // ESC 键关闭
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modal.classList.contains('cs-active')) {
        modal.classList.remove('cs-active')
        document.body.style.overflow = ''
      }
    })
  }

  // 初始化
  async function init(): Promise<void> {
    // 注入基础样式并创建挂件
    const setup = () => {
      injectStyles()
      createWidget()
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
        document.body.style.overflow = 'hidden'
      }
    },
    close: () => {
      const modal = document.querySelector('.cs-widget-modal')
      if (modal) {
        modal.classList.remove('cs-active')
        document.body.style.overflow = ''
      }
    },
  }
})()
