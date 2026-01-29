'use client'

'use client'

import { getBot } from '@/api/Bot'
import { Box, Typography, Avatar } from '@mui/material'
import { useEffect, useState } from 'react'

interface IframeHeaderProps {
    readonly title?: string
    readonly subtitle?: string
    readonly onClose?: () => void
}

export default function IframeHeader({
    title,
    subtitle,
    onClose,
}: IframeHeaderProps) {
    const [avatar, setAvatar] = useState('')

    useEffect(() => {
        getBot().then((res: any) => {
            // httpClient 的 request 方法可能经过处理
            // 如果 res 本身包含了数据 (SvcBotGetRes)
            if (res?.data?.avatar) {
                setAvatar(res.data.avatar)
            } else if (res?.avatar) {
                setAvatar(res.avatar)
            }
        })
    }, [])

    return (
        <Box
            sx={{
                borderRadius: '0px!important',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                height: '56px',
                bgcolor: 'white',
                color: 'text.primary',
                boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
            }}
        >

            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                {avatar && (
                    <Avatar
                        src={avatar}
                        sx={{
                            width: 24,
                            height: 24,
                        }}
                    />
                )}
                <Typography
                    variant='subtitle1'
                    sx={{
                        fontWeight: 600,
                        fontSize: '16px',
                    }}
                >
                    {title || '智能客服'}
                </Typography>
            </Box>
        </Box>
    )
}
