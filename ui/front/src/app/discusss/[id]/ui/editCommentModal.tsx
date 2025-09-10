import React, { useState, useEffect } from 'react';
import Modal from '@/components/modal';
import MdEditor from '@/components/mdEditor';
import { ModelDiscussionDetail } from '@/api/types';
import { putDiscussionDiscId } from '@/api/Discussion';

interface EditCommentModalProps {
  data: ModelDiscussionDetail;
  open: boolean;
  onOk: () => void;
  onClose: () => void;
}
const EditCommentModal: React.FC<EditCommentModalProps> = ({
  data,
  open,
  onOk,
  onClose,
}) => {
  const [value, setValue] = useState(data?.content || '');
  useEffect(() => {
    if (data) {
      setValue(data.content || '');
    }
  }, [data]);

  const onSubmit = async () => {
    putDiscussionDiscId(
      { discId: data.id + '' },
      {
        ...data,
        content: value,
        group_ids: data.group_ids || [],
        tags: data.tags || [],
        title: data.title || '',
      }
    ).then(() => {
      onOk();
    });
  };

  return (
    <Modal
      title='编辑'
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okButtonProps={{
        disabled: !value.trim(),
        id: 'edit-comment-id',
      }}
      width={800}
    >
      <MdEditor value={value} onChange={setValue} />
    </Modal>
  );
};

export default EditCommentModal;
