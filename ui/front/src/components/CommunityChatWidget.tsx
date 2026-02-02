"use client"

import React, { useEffect, useState } from 'react'
import { Fab, Fade, Paper } from '@mui/material'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import CustomerServiceContent from '@/app/customer-service/ui/CustomerServiceContent'
import { getSystemWebPlugin } from '@/api/WebPlugin'

const CommunityChatWidget = () => {
    const [visible, setVisible] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const checkConfig = async () => {
            try {
                const res = await getSystemWebPlugin()
                // Show widget if any of: enabled (在线支持), display (在社区前台展示), or plugin (网页挂件) is true
                // This matches backend logic: !webPlugin.Enabled && !webPlugin.Display && !webPlugin.Plugin
                if (res && (res.enabled === true || res.display === true || res.plugin === true)) {
                    setVisible(true)
                }
            } catch (e) {
                console.error('Failed to load chat config', e)
            }
        }
        checkConfig()
    }, [])

    if (!visible) return null

    return (
        <>
            {/* Floating Action Button - Hidden when chat is open */}
            <Fade in={!open} unmountOnExit>
                <Fab
                    onClick={() => setOpen(true)}
                    color="primary"
                    aria-label="chat"
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 2000,
                        width: 56,
                        height: 56,
                    }}
                >
                    <SupportAgentIcon />
                </Fab>
            </Fade>

            {/* Chat Window */}
            <Fade in={open} unmountOnExit>
                <Paper
                    elevation={12}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: { xs: 'calc(100vw - 48px)', sm: 400 },
                        height: 600,
                        maxHeight: 'calc(100vh - 48px)',
                        zIndex: 2000,
                        overflow: 'hidden',
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    <CustomerServiceContent
                        onClose={() => setOpen(false)}
                        isWidgetMode={true}
                        sessionId=""
                    />
                </Paper>
            </Fade>
        </>
    )
}

export default CommunityChatWidget
