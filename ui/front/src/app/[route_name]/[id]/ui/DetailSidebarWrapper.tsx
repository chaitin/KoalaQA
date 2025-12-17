'use client'
import { Box, Stack } from '@mui/material'
import { useRef } from 'react'
import OutlineSidebar from './OutlineSidebar'
import RelatedContent from './RelatedContent'
import AssociatedIssue from './AssociatedIssue'
import AssociatedQuestions from './AssociatedQuestions'
import BrandAttribution from '@/components/BrandAttribution'
import { ModelDiscussionDetail, ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { SimilarDiscussionsPanel } from '@/components'

interface DetailSidebarWrapperProps {
  type?: ModelDiscussionType
  discussion?: ModelDiscussionDetail
  discId?: string
  title?: string
  content?: string
  groupIds?: number[]
  summary?: string
  onSummaryChange?: (val: string) => void
}

const DetailSidebarWrapper = ({
  type,
  discussion,
  discId,
  title,
  content,
  groupIds,
  summary,
  onSummaryChange,
}: DetailSidebarWrapperProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isIssuePost = (discussion?.type ?? type) === ModelDiscussionType.DiscussionTypeIssue
  const isQAPost = (discussion?.type ?? type) === ModelDiscussionType.DiscussionTypeQA
  const isArticle = (discussion?.type ?? type) === ModelDiscussionType.DiscussionTypeBlog

  return (
    <Box
      ref={sidebarRef}
      sx={{
        position: 'sticky',
        top: 26,
        width: 300,
        flexShrink: 0,
        display: { xs: 'none', lg: 'block' },
        height: 'fit-content',
        maxHeight: 'calc(100vh - 90px)',
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        // 隐藏滚动条
        '&::-webkit-scrollbar': { display: 'none' },
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Stack spacing={3} sx={{ flex: 1 }}>
          {isArticle && (
            <OutlineSidebar
              discussion={discussion}
              summary={summary}
              onSummaryChange={onSummaryChange}
              title={title}
              content={content}
            />
          )}
          {/* 问题帖显示关联的 Issue */}
          {isQAPost &&
            (discussion?.id ? (
              <AssociatedIssue associate={discussion.associate || ([] as ModelDiscussionListItem)} />
            ) : (
              <SimilarDiscussionsPanel
                title={title}
                content={content}
                editorContent={discussion?.content}
                groupIds={discussion?.group_ids || groupIds}
              />
            ))}
          {/* Issue 帖显示关联的问题列表 */}
          {discId && (isIssuePost ? <AssociatedQuestions discId={discId} /> : <RelatedContent discId={discId} />)}
        </Stack>
        {/* 品牌声明 */}
        <BrandAttribution inSidebar={true} sidebarRef={sidebarRef as React.RefObject<HTMLElement>} />
      </Box>
    </Box>
  )
}

export default DetailSidebarWrapper
