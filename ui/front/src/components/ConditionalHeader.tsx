'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Header from './header'

interface ConditionalHeaderProps {
    brandConfig: any
    initialForums: any[]
}

export default function ConditionalHeader({ brandConfig, initialForums }: ConditionalHeaderProps) {
    const searchParams = useSearchParams()
    // 优先从 URL 参数判断是否是 widget 模式，以避免页面闪烁
    const [isInIframe, setIsInIframe] = useState(() => {
        return searchParams?.get('is_widget') === '1'
    })

    useEffect(() => {
        // 二次确认为 iframe 环境（应对没有传参的情况）
        if (window.self !== window.top) {
            setIsInIframe(true)
        }
    }, [])

    // 如果在 iframe 中，不渲染 Header
    if (isInIframe) {
        return null
    }

    return <Header brandConfig={brandConfig} initialForums={initialForums} />
}
