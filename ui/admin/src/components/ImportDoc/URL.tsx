import {
  AnydocListRes,
  postAdminKbDocumentUrlExport,
  postAdminKbDocumentUrlList,
} from '@/api';
import { useExportDoc } from '@/hooks/useExportDoc';
import { Stack, TextField } from '@mui/material';
import { Modal } from '@ctzhian/ui';
import { useEffect, useState } from 'react';
import Doc2Ai from './Doc2Ai';
import { ImportDocProps } from './type';
import { StepText } from './const';

const URLImport = ({ open, refresh, onCancel }: ImportDocProps) => {
  const [step, setStep] = useState<keyof typeof StepText>('upload');
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<AnydocListRes[]>([]);
  const [selectIds, setSelectIds] = useState<string[]>([]);
  const [requestQueue, setRequestQueue] = useState<
    (() => Promise<AnydocListRes>)[]
  >([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const { taskIds, handleImport, fileReImport } = useExportDoc({
    onFinished: () => {
      setStep('done');
      setLoading(false);
    },
    setLoading,
  });
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
    const newQueue = await Promise.all(
      url.split('\n').map((url) => ()=>postAdminKbDocumentUrlList({ url }))
    );
    setRequestQueue(newQueue);
  };

  const handleOk = async () => {
    if (step === 'done') {
      handleCancel();
      refresh?.({});
    } else if (step === 'upload') {
      if (!url) return;
      setLoading(true);
      setIsCancelled(false);
      handleURL();
    } else if (step === 'import') {
      setLoading(true);
      handleImport(selectIds, postAdminKbDocumentUrlExport, items);
    }
  };

  const processUrl = async () => {
    if (isCancelled) {
      setItems([]);
    }
    if (requestQueue.length === 0 || isCancelled) {
      setLoading(false);
      // 避免队列已为空时反复 set 一个新的 []，造成额外渲染
      setRequestQueue((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    setLoading(true);
    const newQueue = [...requestQueue];
    const requests = newQueue.splice(0, 2);

    try {
      const _items = await Promise.all(requests.map((request) => request()));
      setItems((prevItems) => [...prevItems, ..._items]);
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
      } else {
        setLoading(false);
        setStep('import');
        setRequestQueue((prev) => (prev.length === 0 ? prev : []));
      }
    } catch (error) {
      console.error('请求执行出错:', error);
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
        setStep('import');
      } else {
        setLoading(false);
        setRequestQueue((prev) => (prev.length === 0 ? prev : []));
      }
    }
  };

  useEffect(() => {
    processUrl();
  }, [requestQueue.length, isCancelled]);

  return (
    <Modal
      title={`通过 URL 导入`}
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
            URL 地址
          </Stack>
          <TextField
            fullWidth
            multiline={true}
            rows={4}
            value={url}
            placeholder={'每行一个 URL'}
            autoFocus
            onChange={(e) => setUrl(e.target.value)}
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

export default URLImport;
