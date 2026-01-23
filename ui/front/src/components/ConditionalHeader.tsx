'use client'

import { useEffect, useState } from 'react'
import Header from './header'

interface ConditionalHeaderProps {
    brandConfig: any
    initialForums: any[]
}

export default function ConditionalHeader({ brandConfig, initialForums }: ConditionalHeaderProps) {
    const [isInIframe, setIsInIframe] = useState(false)

    useEffect(() => {
        // 检测是否在 iframe 中
        setIsInIframe(window.self !== window.top)
    }, [])

    // 如果在 iframe 中，不渲染 Header
    if (isInIframe) {
        return null
    }

    return <Header brandConfig={brandConfig} initialForums={initialForums} />
}
