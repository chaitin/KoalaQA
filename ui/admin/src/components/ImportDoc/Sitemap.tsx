import {
  AnydocListRes,
  postAdminKbDocumentSitemapExport,
  postAdminKbDocumentSitemapList,
} from '@/api';
import { useExportDoc } from '@/hooks/useExportDoc';
import { Modal } from '@ctzhian/ui';
import { TextField } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
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
    const inputUrl = url.trim();
    if (!inputUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const newQueue: (() => Promise<any>)[] = [];
    try {
      const res = await postAdminKbDocumentSitemapList({ url: inputUrl });
      setItems(
        res.docs?.map(item => ({
          uuid: res.uuid,
          docs: [item],
        })) || []
      );
      setStep('import');
      setRequestQueue(newQueue);
    } finally {
      setLoading(false);
    }
  };

  const handleOk = async () => {
    if (step === 'done') {
      handleCancel();
      refresh?.({});
    } else if (step === 'upload') {
      setIsCancelled(false);
      await handleURL();
    } else if (step === 'import') {
      setLoading(true);
      handleImport(selectIds, postAdminKbDocumentSitemapExport, items);
    }
  };
  const processUrl = useCallback(async () => {
    if (isCancelled) {
      setItems([]);
    }
    if (requestQueue.length === 0 || isCancelled) {
      setLoading(false);
      // 避免 requestQueue 已为空时反复 set 一个新的 []，触发无限渲染循环
      setRequestQueue(prev => (prev.length === 0 ? prev : []));
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
        setRequestQueue(prev => (prev.length === 0 ? prev : []));
      }
    } catch (error) {
      console.error('请求执行出错:', error);
      if (newQueue.length > 0 && !isCancelled) {
        setRequestQueue(newQueue);
      } else {
        setLoading(false);
        setRequestQueue(prev => (prev.length === 0 ? prev : []));
      }
    }
  }, [isCancelled, requestQueue]);

  useEffect(() => {
    processUrl();
  }, [processUrl]);

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
        <TextField
          label="Sitemap 地址"
          fullWidth
          multiline={false}
          rows={1}
          value={url}
          placeholder={'Sitemap 地址'}
          autoFocus
          onChange={e => setUrl(e.target.value)}
        />
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
