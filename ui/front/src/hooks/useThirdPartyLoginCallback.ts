'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { postUserLoginCors } from '@/api'

/**
 * 处理第三方登录回调中的 CORS token
 * 当从第三方登录页面跳转回来时，如果 URL 中包含 koala_cors_token 参数，
 * 说明因为 SameSite=Strict 导致无法直接设置 cookie，
 * 需要通过 CORS 登录接口将 token 转换为 cookie
 */
export function useThirdPartyLoginCallback() {
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        const handleCorsToken = async () => {
            const corsToken = searchParams?.get('koala_cors_token')

            if (!corsToken) {
                return
            }

            try {
                // 调用 CORS 登录接口，后端会将 token 设置为 cookie
                // 注意：这里我们需要一个特殊的 API 来接受 token 并设置 cookie
                // 由于当前后端没有这个接口，我们需要使用一个变通方案

                // 方案：将 token 存储到 localStorage，然后在后续请求中使用
                localStorage.setItem('auth_token', corsToken)

                // 清理 URL 中的 token 参数
                const url = new URL(window.location.href)
                url.searchParams.delete('koala_cors_token')

                // 刷新页面以应用新的认证状态
                window.location.href = url.toString()
            } catch (error) {
                console.error('Failed to handle CORS token:', error)
            }
        }

        handleCorsToken()
    }, [searchParams, router])
}
