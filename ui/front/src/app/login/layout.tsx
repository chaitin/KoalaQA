import { Box } from '@mui/material'
import React from 'react'

const layout = (props: { children: React.ReactNode }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: '#fff',
        height: 'calc(100vh - 64px)',
      }}
    >
      {props.children}
    </Box>
  )
}

export default layout
