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
      box-shadow: 0px 4px 8px 0px rgba(33,34,45,0.05);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      /* transition: all 0.4s ease; */
      z-index: ${config.zIndex};
      outline: none;
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
      position: relative;
      top: 2px;
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
      /* transition: all 0.4s ease; */
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
        <svg t="1769679882202" class="cs-widget-button-icon" viewBox="0 0 1424 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="18085" width="200" height="200" fill="${config.buttonColor}"><path d="M480.879095 473.533012a47.193023 47.10398 0 1 0 94.386046 0 47.193023 47.10398 0 1 0-94.386046 0Z" p-id="18086"></path><path d="M847.82711 473.533012a47.193023 47.10398 0 1 0 94.386046 0 47.193023 47.10398 0 1 0-94.386046 0Z" p-id="18087"></path><path d="M712.213951 654.024063c77.15614 0 100.97526-54.405542 100.975261-121.455251 0-67.04971-45.234067-121.455252-100.975261-121.455252-55.741193 0-100.930739 54.405542-100.930739 121.455252 0 67.04971 23.774598 121.41073 100.930739 121.41073z" p-id="18088"></path><path d="M1159.879844 2.047999c96.389523 12.68869 173.412099 61.039278 229.598508 144.116807l34.94955 51.600673-59.881713-17.229905-1.691825-0.445218-11.39756-3.294607-0.75687-0.222608 0.712348 1.335651c23.106773 43.49772 38.733896 89.355092 46.836849 137.483071l9.750257 57.74467-42.874416-33.791985 0.133565 2.137043c3.383651 54.761715-7.435127 100.97526-31.877552 130.359595l-19.812165 23.774599-16.606601-26.089728-0.445217-0.712348-3.383651-5.253563-0.445217 0.445217a226.571032 226.571032 0 0 1-116.513341 89.399614 307.466997 307.466997 0 0 0-79.560313-17.897732c0.311652-58.145366-14.469559-127.332119-44.78885-207.471214-11.263995-22.706077-26.802075-52.402064-12.332517-74.395793 19.545035-29.651465 18.38747-29.829552 0-25.377381-5.342606 1.29113-12.555125 4.318607-19.990252 7.435127l-1.513738 0.623305-2.092521 0.890434-2.671303 1.068521-1.024 0.445217c-15.449037 6.233041-28.805553 10.373561-23.062251-3.428172 31.476856-75.731445 92.42709-117.759949 160.856974-117.759949s103.735607 55.028846 109.389865 63.042755c5.609737 8.01391 20.836165 37.220158 5.654259 17.274428-15.226428-19.94573-42.918938-52.535629-115.044124-52.53563s-128.534205 62.330408-110.502909 58.323453c4.363129-0.934956 7.880344-1.958956 11.353039-2.893912l0.845912-0.26713 0.890435-0.222608 0.979478-0.267131 1.335651-0.356174 0.712348-0.178086c9.349561-2.315129 20.168339-3.739824 45.412154-1.602782 38.867461 3.339129 27.915118 16.250428 3.472694 23.462946-24.442424 7.167997-49.508152 24.308859-22.038251 28.939118 27.469901 4.630259 53.871281 25.199293 67.539449 51.956847 13.579125 26.802075 3.606259 22.572512-21.058774 11.887299-16.651123-7.25704-31.254247-11.041387-36.953027-7.435127 30.185726 78.536314 46.747806 148.524457 49.463631 209.919909 58.635105-14.380515 102.622564-48.751283 130.537682-107.43091l18.431992-38.733896 21.503991 37.086592 2.226086 3.87339c8.948866-30.5419 8.904344-72.659447-1.780869-120.609339l-14.335994-63.666059 39.624331 32.278246-0.311652-0.890434a426.562597 426.562597 0 0 0-54.939803-106.763084l-36.685897-52.223977 59.79267 17.09634c-42.028503-38.956505-92.249003-61.974234-151.507412-69.765535-80.628835-10.596169-152.887586 29.829552-218.601645 124.838902l-18.699122-12.911298c-60.683104-40.64833-128.756814-61.0838-205.067041-61.0838-72.882055 0-138.284462 18.654601-196.652436 56.008324l-25.956163 17.986774c-65.714058-94.964828-138.017331-135.435072-218.601644-124.838902-59.258409 7.791301-109.523431 30.80903-151.240282 69.453883l59.525539-16.784688-36.685897 52.223977a426.562597 426.562597 0 0 0-54.984324 106.807606l-0.26713 0.845912 39.62433-32.278246-14.335993 63.666059c-10.729734 47.949892-10.774256 90.067439-2.092521 120.297687l0.133565 0.489739c0.890434-1.469217 1.780869-2.982955 2.226086-3.87339l21.682078-37.264679 18.38747 38.733896c27.915118 58.635105 71.858056 92.961351 130.404117 107.386388 2.671303-61.261886 19.188861-131.071943 49.241022-209.385648-5.119998-4.363129-20.212861-0.578782-37.53181 6.945388-24.665033 10.685213-34.637898 14.914776-21.014251-11.887299 13.579125-26.713032 40.069548-47.326588 67.494927-51.956847 27.469901-4.630259 2.404173-21.771121-22.038252-28.939118-24.442424-7.212519-35.394767-20.123817 3.472695-23.462946 24.08625-2.003477 35.038593-0.845913 44.121024 1.335651l0.712347 0.133565 0.667826 0.178087 1.335652 0.311652 1.647303 0.445218 2.58226 0.712347 0.890435 0.222609c2.893912 0.845913 5.96591 1.647304 9.572169 2.448694 18.031297 4.006955-38.333201-58.323453-110.458386-58.323453-72.125186 0-99.862217 32.589899-115.044124 52.53563-10.239996 13.490081-6.678258 4.541215-1.558261-5.16452l0.356174-0.578782 0.311652-0.623304 0.667826-1.157565c2.092521-3.87339 4.318607-7.568692 5.876867-9.794778 5.609737-7.969388 40.959982-62.998233 109.389866-62.998234s129.335596 42.028503 160.812451 117.759949c6.633736 15.849732-12.020864 8.058431-30.05216 0.534261l-1.068522-0.445218-1.55826-0.667825a135.346028 135.346028 0 0 0-17.675123-6.45565c-18.38747-4.452172-19.545035-4.274085 0 25.377381 13.000342 19.767644 1.780869 45.768328-8.8153 67.31684-59.124844 153.065673-62.597538 266.64058-13.089386 341.437069 52.535629 79.47127 168.559231 120.520295 350.074283 120.520295 17.764166 0 34.905028-0.356174 51.378064-1.157565-3.11652 14.781211-5.164519 29.963117-6.099475 45.456676-14.603124 0.623304-29.740509 0.890434-45.278589 0.890435-195.094176 0-325.008554-46.035458-387.784179-140.777678-23.418425-35.394767-36.953027-76.844488-40.781896-124.304642-63.844146-13.044864-115.622906-45.278589-151.819064-99.060826l-0.400696-0.534261-3.428172 5.387128-0.445217 0.712348-16.651123 26.089728-19.767644-23.774599c-24.486946-29.384335-35.305724-75.59788-31.922073-130.359595l0.178087-2.137043-42.874416 33.791985 9.750256-57.74467c8.102953-48.127979 23.730077-93.940829 46.836849-137.483071l0.712348-1.335651-0.756869 0.222608-11.442082 3.250086-1.647304 0.489739L0 197.765479l34.905028-51.645195C91.13596 63.131799 168.114014 14.781211 264.548059 2.092521c87.529701-11.486604 166.155058 25.37738 234.718507 108.232301l0.756869-0.445218c63.354407-38.199636 134.010377-57.343975 211.611734-57.343975 78.224662 0 149.414892 19.455992 213.169994 58.278932 68.563448-83.211094 147.366892-120.208643 235.074681-108.72204z" p-id="18089"></path><path d="M1089.268396 1010.197822a22.52799 22.52799 0 0 1-41.538765 0l-10.952343-25.199294a194.203742 194.203742 0 0 0-98.838218-100.129348l-33.747463-15.048341a23.596511 23.596511 0 0 1 0-42.874416l31.877551-14.157907a194.292785 194.292785 0 0 0 100.17387-103.55752l11.308517-27.202771a22.52799 22.52799 0 0 1 41.850416 0l11.308517 27.202771a194.292785 194.292785 0 0 0 100.173869 103.55752l31.966595 14.157907a23.596511 23.596511 0 0 1 0 42.874416l-33.836507 15.048341a194.203742 194.203742 0 0 0-98.793696 100.129348l-10.952343 25.199294z" p-id="18090"></path></svg>
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
