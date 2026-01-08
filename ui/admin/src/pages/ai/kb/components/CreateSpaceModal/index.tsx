import { Modal } from '@ctzhian/ui';
import { Box, Link, Stack } from '@mui/material';
import { UseFormReturn } from 'react-hook-form';
import { PlatformPlatformType } from '@/api';
import { AdminDocUserRes } from '@/api/types';
import { getPlatformLabel } from '../../utils';
import { PandaWikiForm } from './PandaWikiForm';
import { DingtalkForm } from './DingtalkForm';
import { FeishuForm } from './FeishuForm';

interface CreateSpaceModalProps {
  open: boolean;
  onClose: () => void;
  onOk: (data: any) => void;
  form: UseFormReturn<any>;
  editSpace: any;
  selectedPlatform: number;
  dingtalkStep: number;
  onDingtalkNextStep: () => void;
  onDingtalkPrevStep: () => void;
  onDingtalkGetSpaces: () => void;
  feishuBoundUser: AdminDocUserRes | null;
  needsRebind: boolean;
  onBindFeishuAccount: () => void;
  onUnbindFeishuAccount: () => void;
  onImagePreview: (src: string, alt: string) => void;
}

export const CreateSpaceModal = ({
  open,
  onClose,
  onOk,
  form,
  editSpace,
  selectedPlatform,
  dingtalkStep,
  onDingtalkNextStep,
  onDingtalkPrevStep,
  onDingtalkGetSpaces,
  feishuBoundUser,
  needsRebind,
  onBindFeishuAccount,
  onUnbindFeishuAccount,
  onImagePreview,
}: CreateSpaceModalProps) => {
  const { handleSubmit } = form;

  const renderForm = () => {
    if (
      [PlatformPlatformType.PlatformDingtalk, PlatformPlatformType.PlatformFeishu].includes(
        selectedPlatform
      )
    ) {
      if (selectedPlatform === PlatformPlatformType.PlatformDingtalk) {
        return (
          <DingtalkForm
            form={form}
            step={dingtalkStep}
            editSpace={editSpace}
            onImagePreview={onImagePreview}
          />
        );
      } else {
        return (
          <FeishuForm
            form={form}
            feishuBoundUser={feishuBoundUser}
            needsRebind={needsRebind}
            onBindFeishuAccount={onBindFeishuAccount}
            onUnbindFeishuAccount={onUnbindFeishuAccount}
          />
        );
      }
    }

    return <PandaWikiForm form={form} selectedPlatform={selectedPlatform} />;
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box>{editSpace ? '编辑知识库' : `${getPlatformLabel(selectedPlatform)}文档`}</Box>
          {selectedPlatform !== PlatformPlatformType.PlatformPandawiki && (
            <Link
              href="https://koalaqa.docs.baizhi.cloud/node/019951c2-e49b-7ea5-9f75-74f3851d53dd"
              target="_blank"
              sx={{ color: '#3248F2', fontSize: 14 }}
            >
              使用文档
            </Link>
          )}
        </Stack>
      }
      onOk={
        dingtalkStep === 1 && !editSpace ? onDingtalkNextStep : handleSubmit(onOk)
      }
      okText={
        selectedPlatform === PlatformPlatformType.PlatformDingtalk &&
        dingtalkStep === 1 &&
        !editSpace
          ? '下一步'
          : '确定'
      }
      width={dingtalkStep === 2 ? 1000 : undefined}
      footer={
        dingtalkStep === 2 ? (
          <Stack direction="row" spacing={2} sx={{ px: 3, py: 2 }} justifyContent="flex-end">
            <button onClick={onDingtalkPrevStep}>上一步</button>
            <button onClick={onDingtalkGetSpaces}>获取知识库</button>
          </Stack>
        ) : undefined
      }
    >
      {renderForm()}
    </Modal>
  );
};

