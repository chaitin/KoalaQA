'use client'
import { Box, Stack } from '@mui/material'
import { useRef } from 'react'
import OutlineSidebar from './OutlineSidebar'
import RelatedContent from './RelatedContent'
import BrandAttribution from '@/components/BrandAttribution'
import { ModelDiscussionDetail } from '@/api/types'

interface DetailSidebarWrapperProps {
  isArticle: boolean
  discussion: ModelDiscussionDetail
  discId: string
}

const DetailSidebarWrapper = ({ isArticle, discussion, discId }: DetailSidebarWrapperProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null)

  return (
    <Box
      ref={sidebarRef}
      sx={{
        width: 300,
        flexShrink: 0,
        display: { xs: 'none', lg: 'block' },
        pb: 3,
        pr: 3,
        position: 'sticky',
        top: 88,
        // maxHeight: 'calc(100vh - 100px)',
        // overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack spacing={3} sx={{ flex: 1 }}>
          {isArticle && <OutlineSidebar discussion={discussion} />}
          <RelatedContent discId={discId} />
        </Stack>
        {/* 品牌声明 */}
        <BrandAttribution inSidebar={true} sidebarRef={sidebarRef as React.RefObject<HTMLElement>} />
      </Box>
    </Box>
  )
}

export default DetailSidebarWrapper

