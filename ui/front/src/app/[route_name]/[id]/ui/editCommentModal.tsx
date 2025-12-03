import { ModelDiscussionComment, ModelDiscussionReply, ModelUserRole } from '@/api/types'
import EditorWrap, { EditorWrapRef } from '@/components/editor'
import Modal from '@/components/modal'
import { isAdminRole } from '@/lib/utils'
import { useQuickReplyStore } from '@/store'
import { Box, Button } from '@mui/material'
import React, { useRef } from 'react'

interface EditCommentModalProps {
  data: ModelDiscussionComment | ModelDiscussionReply
  open: boolean
  onOk: (val: string) => void
  onClose: () => void
  isQAPost?: boolean
  userRole?: ModelUserRole
}
const EditCommentModal: React.FC<EditCommentModalProps> = ({
  data,
  open,
  onOk,
  onClose,
  isQAPost = false,
  userRole,
}) => {
  const editorRef = useRef<EditorWrapRef>(null)
  const { quickReplies } = useQuickReplyStore()
  const isAdmin = isAdminRole(userRole || ModelUserRole.UserRoleUnknown)

  const onSubmit = async () => {
    const content = editorRef.current?.getContent() || data?.content || ''
    onOk(content)
  }

  return (
    <Modal
      title='编辑'
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okButtonProps={{
        disabled: !data?.content?.trim(),
        id: 'edit-comment-id',
      }}
      width={800}
      footer={({ OkBtn, CancelBtn }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* 快捷回复选择器（管理员/运营可见，仅问答类型） */}
          {isAdmin && isQAPost && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {quickReplies.map((qr) => (
                <Button
                  variant='outlined'
                  key={qr.id}
                  size='small'
                  sx={{ color: 'text.primary', borderColor: 'text.disabled' }}
                  onClick={() => {
                    if (editorRef.current && typeof editorRef.current.setContent === 'function') {
                      editorRef.current.setContent(qr.content || '')
                    }
                  }}
                >
                  {'# ' + qr.name}
                </Button>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            {CancelBtn}
            {OkBtn}
          </Box>
        </Box>
      )}
    >
      <Box
        sx={{
          border: '1px solid #e5e7eb',
          p: 2,
          borderRadius: 1,
          '& .editor-toolbar + div': { minHeight: '150px', maxHeight: '350px' },
        }}
      >
        <EditorWrap ref={editorRef} value={data?.content} />
      </Box>
    </Modal>
  )
}

export default EditCommentModal
