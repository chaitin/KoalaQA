'use client'
import { Box, Stack } from '@mui/material'
import { useRef } from 'react'
import OutlineSidebar from './OutlineSidebar'
import RelatedContent from './RelatedContent'
import AssociatedIssue from './AssociatedIssue'
import AssociatedQuestions from './AssociatedQuestions'
import BrandAttribution from '@/components/BrandAttribution'
import { ModelDiscussionDetail, ModelDiscussionType } from '@/api/types'

interface DetailSidebarWrapperProps {
  isArticle: boolean
  discussion: ModelDiscussionDetail
  discId: string
}

const DetailSidebarWrapper = ({ isArticle, discussion, discId }: DetailSidebarWrapperProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isIssuePost = discussion.type === ModelDiscussionType.DiscussionTypeIssue
  const isQAPost = discussion.type === ModelDiscussionType.DiscussionTypeQA

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
        top: 26,
        // maxHeight: 'calc(100vh - 100px)',
        // overflowY: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack spacing={3} sx={{ flex: 1 }}>
          {isArticle && <OutlineSidebar discussion={discussion} />}
          {/* 问题帖显示关联的 Issue */}
          {isQAPost && discussion.associate && (
            <AssociatedIssue associate={discussion.associate} />
          )}
          {/* Issue 帖显示关联的问题列表 */}
          {isIssuePost ? <AssociatedQuestions discId={discId} /> : <RelatedContent discId={discId} />}
        </Stack>
        {/* 品牌声明 */}
        <BrandAttribution inSidebar={true} sidebarRef={sidebarRef as React.RefObject<HTMLElement>} />
      </Box>
    </Box>
  )
}

export default DetailSidebarWrapper

