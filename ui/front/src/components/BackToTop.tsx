'use client'

import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { Fab, Fade, styled } from '@mui/material'
import { useEffect, useState } from 'react'

const StyledFab = styled(Fab)(({ theme }) => ({
    position: 'fixed',
    bottom: theme.spacing(12), // Desktop: 96px (24px bottom + 56px widget + 16px gap)
    right: theme.spacing(3),
    zIndex: 2000,
    [theme.breakpoints.down('lg')]: {
        left: 'auto',
        right: theme.spacing(3),
        bottom: 136, // 80px (CS widget bottom) + 40px (CS widget height) + 16px (gap)
        width: 40,
        height: 40,
        minHeight: 40,
    }
}))

export default function BackToTop() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // 确保组件挂载后获取元素
        const mainContent = document.getElementById('main-content')
        if (!mainContent) return

        const handleScroll = () => {
            // 超过一屏高度显示
            setIsVisible(mainContent.scrollTop > window.innerHeight)
        }

        // 立即检查一次
        handleScroll()

        mainContent.addEventListener('scroll', handleScroll)
        return () => mainContent.removeEventListener('scroll', handleScroll)
    }, [])

    const handleClick = () => {
        const mainContent = document.getElementById('main-content')
        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: 'smooth',
            })
        }
    }

    return (
        <Fade in={isVisible}>
            <StyledFab
                size='large'
                onClick={handleClick}
                aria-label='scroll back to top'
                sx={{
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                        bgcolor: 'background.paper',
                        filter: 'brightness(0.96)',
                        border: '1px solid',
                        borderColor: 'primary.main',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                    }
                }}
            >
                <ArrowUpwardIcon />
            </StyledFab>
        </Fade>
    )
}
