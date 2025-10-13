import {
  AnydocListRes,
  postAdminKbDocumentSitemapExport,
  postAdminKbDocumentSitemapList,
} from '@/api';
import { useExportDoc } from '@/hooks/useExportDoc';
import { Modal } from '@ctzhian/ui';
import { Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { StepText } from './const';
import Doc2Ai from './Doc2Ai';
import { ImportDocProps } from './type';

const SitemapImport = ({ open, refresh, onCancel }: ImportDocProps) => {
  const [step, setStep] = useState<keyof typeof StepText>('upload');
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<AnydocListRes[]>([]);
  const [selectIds, setSelectIds] = useState<string[]>([]);
  const [requestQueue, setRequestQueue] = useState<(() => Promise<any>)[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const { taskIds, handleImport } = useExportDoc({
    onFinished: () => {
      setStep('done');
      setLoading(false);
    },
    setLoading: (loading: boolean) => {
      setLoading(loading);
    },
  });
  const fileReImport = (ids: string[], items: AnydocListRes[]) => {
    setLoading(true);
    return handleImport(ids, postAdminKbDocumentSitemapExport, items);
  };

  const handleCancel = () => {
    setIsCancelled(true);
    setRequestQueue([]);
    setStep('upload');
    setUrl('');
    setItems([]);
    setSelectIds([]);
    setLoading(false);
    onCancel();
    refresh?.({});
  };

  const handleURL = async () => {
    const newQueue: (() => Promise<any>)[] = [];
    const res = await postAdminKbDocumentSitemapList({ url });
    setItems([res]);
    setStep('import');
    setRequestQueue(newQueue);
  };

  const handleOk = async () => {
    if (step === 'done') {
      handleCancel();
      refresh?.({});
    } else if (step === 'upload') {
      setLoading(true);
      setIsCancelled(false);
      handleURL();
    } else if (step === 'import') {
      setLoading(true);
      handleImport(selectIds, postAdminKbDocumentSitemapExport, items);
    }
  };

  const processUrl = async () => {
    if (isCancelled) {
      setItems([]);
    }
    if (requestQueue.length === 0 || isCancelled) {
      setLoading(false);
      setRequestQueue([]);
      return;
    }

    setLoading(true);
    const newQueue = [...requestQueue];
    const requests = newQueue.splice(0, 2);

    try {
      await Promise.all(requests.map(request => request()));
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
      } else {
        setLoading(false);
        setRequestQueue([]);
      }
    } catch (error) {
      console.error('请求执行出错:', error);
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
      } else {
        setLoading(false);
        setRequestQueue([]);
      }
    }
  };

  useEffect(() => {
    processUrl();
  }, [requestQueue.length, isCancelled]);

  return (
    <Modal
      title={`通过 Sitemap 导入`}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      disableEscapeKeyDown
      okText={StepText[step].okText}
      showCancel={StepText[step].showCancel}
      okButtonProps={{ loading }}
    >
      {step === 'upload' && (
        <>
          <Stack
            direction={'row'}
            alignItems={'center'}
            justifyContent={'space-between'}
            sx={{
              fontSize: 14,
              lineHeight: '32px',
              mb: 1,
            }}
          >
            Sitemap 地址
          </Stack>
          <TextField
            fullWidth
            multiline={false}
            rows={1}
            value={url}
            placeholder={'Sitemap 地址'}
            autoFocus
            onChange={e => setUrl(e.target.value)}
          />
        </>
      )}
      {step !== 'upload' && (
        <Doc2Ai
          handleImport={fileReImport}
          selectIds={selectIds}
          setSelectIds={setSelectIds}
          taskIds={taskIds}
          items={items}
          loading={loading}
          showSelectAll={['pull-done', 'import'].includes(step)}
        />
      )}
    </Modal>
  );
};

export default SitemapImport;
