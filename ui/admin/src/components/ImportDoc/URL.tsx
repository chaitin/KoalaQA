import {
  AnydocListRes,
  postAdminKbDocumentUrlExport,
  postAdminKbDocumentUrlList,
} from '@/api';
import { useExportDoc } from '@/hooks/useExportDoc';
import { Stack, TextField } from '@mui/material';
import { Modal } from '@ctzhian/ui';
import { useEffect, useRef, useState } from 'react';
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
  const processingRef = useRef(false);
  const { handleImport, fileReImport } = useExportDoc({
    onFinished: () => {
      handleCancel()
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
    processingRef.current = false;
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

  useEffect(() => {
    if (processingRef.current) return;
    if (requestQueue.length === 0 || isCancelled) {
      if (!isCancelled) {
        setLoading(false);
      }
      return;
    }

    const processQueue = async () => {
      processingRef.current = true;
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
      } finally {
        processingRef.current = false;
      }
    };

    processQueue();
  }, [requestQueue, isCancelled]);

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
          selectIds={selectIds}
          setSelectIds={setSelectIds}
          items={items}
          loading={loading}
          showSelectAll={['pull-done', 'import'].includes(step)}
        />
      )}
    </Modal>
  );
};

export default URLImport;
