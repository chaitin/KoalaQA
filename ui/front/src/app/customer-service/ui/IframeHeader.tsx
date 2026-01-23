'use client'

import { Box, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface IframeHeaderProps {
    title?: string
    subtitle?: string
    avatar?: string
}

export default function IframeHeader({
    title = '百智云小助手',
    subtitle = '智能客服',
    avatar = '',
}: IframeHeaderProps) {
    return (
        <Box
            sx={{
                position: 'fixed',
                right: 0,
                left: 0,
                top: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2.5,
                pt: 2,
                pb: 1,
                bgcolor: 'primary.main',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
        >
            {/* 左侧：图标 + 标题 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                    }}
                >
                    {avatar ? (
                        <Box
                            component="img"
                            src={avatar}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    ) : (
                        <Typography sx={{ fontSize: '20px' }}>🎧</Typography>
                    )}
                </Box>
                <Box>
                    <Typography
                        variant='body1'
                        sx={{
                            fontSize: '16px',
                            fontWeight: 600,
                            lineHeight: 1.2,
                            color: 'white',
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        variant='caption'
                        sx={{
                            fontSize: '12px',
                            lineHeight: 1,
                            color: 'rgba(255, 255, 255, 0.9)',
                        }}
                    >
                        {subtitle}
                    </Typography>
                </Box>
            </Box>

        </Box>
    )
}
