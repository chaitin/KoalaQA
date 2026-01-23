'use client'

import { Box, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface IframeHeaderProps {
    title?: string
    subtitle?: string
    avatar?: string
    onClose?: () => void
}

export default function IframeHeader({
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
            <Typography
                variant='subtitle1'
                sx={{
                    fontWeight: 600,
                    fontSize: '14px',
                }}
            >
                智能客服
            </Typography>

            {/* <IconButton
                onClick={onClose}
                sx={{
                    color: 'text.secondary',
                    '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                        color: 'text.primary',
                    },
                }}
                size="small"
                title="关闭"
            >
                <CloseIcon fontSize="small" />
            </IconButton> */}
        </Box>
    )
}
