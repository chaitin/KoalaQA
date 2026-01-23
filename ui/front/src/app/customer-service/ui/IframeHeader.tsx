'use client'

import { Box, Typography } from '@mui/material'

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
    return (
        <Box
            sx={{
                borderRadius: '0px!important',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                height: '42px',
                bgcolor: 'white',
                color: 'text.primary',
                boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography
                    variant='subtitle1'
                    sx={{
                        fontWeight: 600,
                        fontSize: '14px',
                    }}
                >
                    {title || '智能客服'}
                </Typography>
                {subtitle && (
                    <Typography
                        variant='caption'
                        sx={{
                            color: 'text.secondary',
                            fontSize: '12px',
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>
        </Box>
    )
}
