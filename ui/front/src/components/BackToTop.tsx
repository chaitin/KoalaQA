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
        left: theme.spacing(3),
        right: 'auto',
        bottom: theme.spacing(12), // 24px (CS offset) + 56px (CS size) + 16px (gap) ~ 96px => spacing(12) is 96px. 
        // CS widget is fixed at bottom 24px. 
        // 24 + 56 = 80.
        // 80 + 16 = 96.
        // So spacing(12) is correct.
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
                color='primary'
                size='large'
                onClick={handleClick}
                aria-label='scroll back to top'
            >
                <ArrowUpwardIcon />
            </StyledFab>
        </Fade>
    )
}
