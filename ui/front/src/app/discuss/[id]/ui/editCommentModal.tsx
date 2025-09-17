import { ModelDiscussionComment } from '@/api/types';
import MdEditor from '@/components/mdEditor';
import Modal from '@/components/modal';
import React, { useEffect, useState } from 'react';

interface EditCommentModalProps {
  data: ModelDiscussionComment;
  open: boolean;
  onOk: (val: string) => void;
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
    onOk(value);
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
