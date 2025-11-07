import { ModelDiscussionComment } from '@/api/types'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import Modal from '@/components/modal'
import React, { useRef } from 'react'

interface EditCommentModalProps {
  data: ModelDiscussionComment
  open: boolean
  onOk: (val: string) => void
  onClose: () => void
}
const EditCommentModal: React.FC<EditCommentModalProps> = ({ data, open, onOk, onClose }) => {
  const editorRef = useRef<EditorWrapRef>(null)

  const onSubmit = async () => {
    const content = editorRef.current?.getHTML() || data?.content || ''
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
    >
      <EditorWrap ref={editorRef} value={data?.content} showActions={false} />
    </Modal>
  )
}

export default EditCommentModal
