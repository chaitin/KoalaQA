'use client'
import { useEffect, useState } from 'react'
import dayjs from '@/lib/dayjs'

interface TimeDisplayProps {
  timestamp: number
  format?: 'relative' | 'absolute' | 'both'
  className?: string
  style?: React.CSSProperties
}

/**
 * 格式化时间显示
 * 超过7天显示"几月几日"，7天内显示相对时间
 */
const formatTimeDisplay = (timestamp: number): string => {
  const now = dayjs()
  const targetTime = dayjs.unix(timestamp)
  const diffDays = now.diff(targetTime, 'day')
  
  // 超过7天显示"几月几日"
  if (diffDays > 7) {
    return targetTime.format('M月D日')
  }
  
  // 7天内显示相对时间
  return targetTime.fromNow()
}

/**
 * 时间显示组件，解决 SSR 水合不匹配问题
 * 在服务器端渲染时显示绝对时间，在客户端渲染时显示相对时间
 */
export const TimeDisplay = ({ 
  timestamp, 
  format = 'relative', 
  className, 
  style
}: TimeDisplayProps) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const absoluteTime = dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm')
  const relativeTime = formatTimeDisplay(timestamp)

  if (format === 'absolute') {
    return (
      <span className={className} style={style}>
        {absoluteTime}
      </span>
    )
  }

  if (format === 'both') {
    return (
      <span className={className} style={style}>
        {isClient ? relativeTime : absoluteTime}
      </span>
    )
  }

  // 默认显示相对时间
  // 服务器端始终显示绝对时间，客户端显示相对时间
  return (
    <span className={className} style={style}>
      {isClient ? relativeTime : absoluteTime}
    </span>
  )
}

/**
 * 带语义化时间标签的时间显示组件
 */
export const TimeDisplayWithTag = ({ 
  timestamp, 
  format = 'relative', 
  className, 
  style,
  title
}: TimeDisplayProps & { title?: string }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const absoluteTime = dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm')
  const relativeTime = formatTimeDisplay(timestamp)

  if (format === 'absolute') {
    return (
      <time 
        dateTime={dayjs.unix(timestamp).format()} 
        title={title || dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')}
        className={className} 
        style={style}
      >
        {absoluteTime}
      </time>
    )
  }

  if (format === 'both') {
    return (
      <time 
        dateTime={dayjs.unix(timestamp).format()} 
        title={title || dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')}
        className={className} 
        style={style}
      >
        {isClient ? relativeTime : absoluteTime}
      </time>
    )
  }

  // 默认显示相对时间
  // 服务器端始终显示绝对时间，客户端显示相对时间
  return (
    <time 
      dateTime={dayjs.unix(timestamp).format()} 
      title={title || dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')}
      className={className} 
      style={style}
    >
      {isClient ? relativeTime : absoluteTime}
    </time>
  )
}
