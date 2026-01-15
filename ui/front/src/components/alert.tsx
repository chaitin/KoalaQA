'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert, { AlertProps, AlertColor } from '@mui/material/Alert'
import { createRoot, Root } from 'react-dom/client'
import { ThemeProvider, useTheme } from '@mui/material/styles'
import { createAppTheme } from '@/theme'

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant='filled' {...props} />
})

export interface WarningProps {
  content: string
  color: AlertColor
  duration?: number
  onClose?: () => void
}

interface AlertItem extends WarningProps {
  id: string
  duration: number
}

interface WarningBarProps {
  alert: AlertItem
  onRemove: (id: string) => void
}

function WarningBar({ alert, onRemove }: Readonly<WarningBarProps>) {
  const theme = useTheme()
  const [open, setOpen] = useState<boolean>(true)

  const handleClose = useCallback(
    (_event?: React.SyntheticEvent | Event, reason?: string) => {
      // 防止点击外部区域关闭
      if (reason === 'clickaway') {
        return
      }
      setOpen(false)
      // 等待动画完成后移除
      setTimeout(() => {
        onRemove(alert.id)
        alert.onClose?.()
      }, 300) // Snackbar 默认过渡动画时间约为 300ms
    },
    [alert, onRemove],
  )

  // Alert 组件的关闭处理函数（只接收 event 参数）
  const handleAlertClose = useCallback(
    (event: React.SyntheticEvent) => {
      setOpen(false)
      // 等待动画完成后移除
      setTimeout(() => {
        onRemove(alert.id)
        alert.onClose?.()
      }, 300) // Snackbar 默认过渡动画时间约为 300ms
    },
    [alert, onRemove],
  )

  useEffect(() => {
    if (alert.duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, alert.duration)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [alert.duration, handleClose])

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={open}
      onClose={handleClose}
      autoHideDuration={null} // 手动控制关闭时间
      sx={{ zIndex: theme.zIndex.snackbar + 100 }}
    >
      <Alert
        severity={alert.color}
        onClose={handleAlertClose}
        sx={{
          boxShadow: 'none',
          ...(alert.color === 'success' && {
            backgroundColor: 'rgb(246, 253, 242)',
            color: 'text.secondary',
            '& .MuiAlert-icon': {
              color: 'success.main',
            },
          }),
        }}
      >
        {alert.content}
      </Alert>
    </Snackbar>
  )
}

// 模块级别的 alert 添加回调
let addAlertCallback: ((alert: AlertItem) => void) | null = null
const alertQueue: AlertItem[] = []

// Alert 管理器组件
function AlertManager() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }, [])

  const addAlert = useCallback((alert: AlertItem) => {
    setAlerts((prev) => [...prev, alert])
  }, [])

  // 注册 addAlert 回调并处理队列
  useEffect(() => {
    addAlertCallback = addAlert

    // 处理队列中等待的 alert
    if (alertQueue.length > 0) {
      alertQueue.forEach((alert) => {
        addAlert(alert)
      })
      alertQueue.length = 0 // 清空队列
    }

    return () => {
      addAlertCallback = null
    }
  }, [addAlert])

  return (
    <>
      {alerts.map((alert) => (
        <WarningBar key={alert.id} alert={alert} onRemove={removeAlert} />
      ))}
    </>
  )
}

// 单例容器和 root
let container: HTMLDivElement | null = null
let root: Root | null = null

function getOrCreateContainer() {
  // 检查是否在浏览器环境中
  try {
    if (globalThis.window === undefined || document === undefined) {
      return null
    }
  } catch {
    return null
  }

  if (!container) {
    container = document.createElement('div')
    container.id = 'alert-container'
    document.body.appendChild(container)
    container.style.zIndex = '11111'
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100%'
  }

  if (!root) {
    const theme = createAppTheme()
    root = createRoot(container)
    root.render(
      <ThemeProvider theme={theme}>
        <AlertManager />
      </ThemeProvider>,
    )
  }

  return container
}

export function callAlert(props: WarningProps, time = 3000) {
  // 检查是否在浏览器环境中
  try {
    if (globalThis.window === undefined || document === undefined) {
      console.warn('callAlert called in SSR environment, skipping...')
      return
    }
  } catch {
    console.warn('callAlert called in SSR environment, skipping...')
    return
  }

  // 确保容器已创建
  getOrCreateContainer()

  // 生成唯一 ID
  const id = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

  // 创建 alert 项
  const alertItem: AlertItem = {
    ...props,
    id,
    duration: time,
  }

  // 如果回调已注册，直接添加；否则加入队列
  if (addAlertCallback) {
    addAlertCallback(alertItem)
  } else {
    alertQueue.push(alertItem)
  }
}

const alertActions = {
  success: (content: string, time?: number) => callAlert({ color: 'success', content }, time),
  warning: (content: string, time?: number) => callAlert({ color: 'warning', content }, time),
  error: (content: string, time?: number) => callAlert({ color: 'error', content }, time),
  info: (content: string, time?: number) => callAlert({ color: 'info', content }, time),
}

export default alertActions
