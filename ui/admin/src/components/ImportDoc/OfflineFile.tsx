import {
  AnydocListRes,
  postAdminKbDocumentFileExport,
  postAdminKbDocumentFileList,
} from '@/api';
import Upload from '@/components/UploadFile/Drag';
import { useExportDoc } from '@/hooks/useExportDoc';
import { formatByte } from '@/utils';
import { Close } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { Modal } from '@ctzhian/ui';
import { useState } from 'react';
import { FileRejection } from 'react-dropzone';
import Doc2Ai from './Doc2Ai';
import { ImportDocProps } from './type';

const StepText = {
  upload: {
    okText: '上传文档',
    showCancel: true,
  },
  'pull-done': {
    okText: '导入数据',
    showCancel: true,
  },
  import: {
    okText: '导入数据',
    showCancel: true,
  },
  done: {
    okText: '完成',
    showCancel: false,
  },
};
enum UploadStatus {
  'uploading',
  'success',
  'error',
}
const OfflineFileImport = ({
  open,
  refresh,
  onCancel,
}: ImportDocProps) => {
  const [step, setStep] = useState<keyof typeof StepText>('upload');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AnydocListRes[]>([]);
  const [selectIds, setSelectIds] = useState<string[]>([]);

  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const [rejectedFiles, setRejectedFiles] = useState<FileRejection[]>([]);
  const [isUploading, setIsUploading] = useState(UploadStatus.uploading);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { taskIds, handleImport } = useExportDoc({
    onFinished: () => {
      setStep('done');
      setLoading(false);
    },
    setLoading: (loading: boolean) => {
      setLoading(loading);
    },
  });
  const onChangeFile = (
    acceptedFiles: File[],
    rejectedFiles: FileRejection[]
  ) => {
    setAcceptedFiles(acceptedFiles);
    setRejectedFiles(rejectedFiles);
    setIsUploading(UploadStatus.uploading);
  };

  const handleRemove = (index: number) => {
    const newFiles = acceptedFiles.filter((_, i) => i !== index);
    setAcceptedFiles(newFiles);
  };

  const handleCancel = () => {
    setStep('upload');
    setItems([]);
    setSelectIds([]);
    setAcceptedFiles([]);
    setRejectedFiles([]);
    setIsUploading(UploadStatus.uploading);
    setCurrentFileIndex(0);
    setUploadProgress(0);
    setLoading(false);
    onCancel();
    refresh?.({});
  };

  const getUrlByUploadFile = (
    file: File,
    onProgress: (progress: number) => void
  ) => {
    return postAdminKbDocumentFileList(
      { file },
      {
        onUploadProgress: (event) => {
          // 如果事件对象有 progress 属性且是 0-1 之间的值，需要乘以 100
          // 如果已经有 progress 属性且是 0-100 的值，直接使用
          // 否则使用 loaded 和 total 计算
          let progress = 0;
          if (event.progress !== undefined) {
            progress = event.progress < 1 ? event.progress * 100 : event.progress;
          } else if (event.loaded && event.total) {
            progress = (event.loaded / event.total) * 100;
          } else {
            progress = 0;
          }
          onProgress(Math.min(progress, 100));
        },
      }
    );
  };
  const fileReImport = (ids: string[], items: AnydocListRes[]) => {
    setLoading(true);
    return handleImport(ids, postAdminKbDocumentFileExport, items);
  };
  const handleFile = async () => {
    if (isUploading === 1) return;
    setIsUploading(UploadStatus.success);
    setCurrentFileIndex(0);
    const docs: AnydocListRes[] = [];
    const errorIdx: number[] = [];
    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        setCurrentFileIndex(i);
        setUploadProgress(0);
        try {
          const file_res = await getUrlByUploadFile(
            acceptedFiles[i],
            (progress) => {
              setUploadProgress(progress);
            }
          );
          docs.push(file_res);
        } catch (error) {
          errorIdx.push(i);
          console.error(`文件 ${acceptedFiles[i].name} 上传失败:`, error);
        }
      }
      if (docs.length > 0) {
        setItems(docs);
        setStep('pull-done');
      }
      setIsUploading(UploadStatus.error);
      setLoading(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOk = async () => {
    if (step === 'done') {
      handleCancel();
      refresh?.({});
    } else if (step === 'upload') {
      setLoading(true);
      handleFile();
    } else if (step === 'pull-done') {
      setLoading(true);
      handleImport(selectIds, postAdminKbDocumentFileExport, items);
    }
  };

  return (
    <Modal
      title={`通过离线文件导入`}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      disableEscapeKeyDown
      okText={StepText[step].okText}
      showCancel={StepText[step].showCancel}
      okButtonProps={{ loading }}
    >
      {step === 'upload' && (
        <Box>
          <Upload
            file={acceptedFiles}
            onChange={(accept, reject) => onChangeFile(accept, reject)}
            type='drag'
            multiple={true}
            accept={'.txt, .md, .xls, .xlsx, .docx, .pdf, .html, .pptx'}
          />
          {isUploading === 1 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ fontSize: 14, mb: 1 }}>
                正在上传文件 {currentFileIndex + 1} / {acceptedFiles.length}
              </Box>
              <Stack
                direction='row'
                alignItems={'center'}
                justifyContent={'space-between'}
                gap={2}
              >
                <Box sx={{ fontSize: 12 }}>
                  {acceptedFiles[currentFileIndex]?.name}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={16} sx={{ mr: 1.5 }} />
                  <Typography variant='body2'>{uploadProgress}%</Typography>
                </Box>
              </Stack>
              <LinearProgress
                variant='determinate'
                value={uploadProgress}
                sx={{
                  height: '4px !important',
                  borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )}
          {(acceptedFiles.length > 0 || rejectedFiles.length > 0) && (
            <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
              <List dense>
                {acceptedFiles.map((file, index) => {
                  return (
                    <ListItem
                      key={`${file.name}-${index}`}
                      sx={{
                        borderBottom: '1px dashed',
                        borderColor: 'divider',
                        ':hover': {
                          backgroundColor: 'background.paper2',
                        },
                      }}
                      secondaryAction={
                        isUploading === 2 ? (
                          <Box sx={{ color: 'error.main', fontSize: 12 }}>
                            上传失败
                          </Box>
                        ) : (
                          <IconButton
                            edge='end'
                            onClick={() => handleRemove(index)}
                          >
                            <Close sx={{ fontSize: 14 }} />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={file.name}
                        secondary={formatByte(file.size)}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          )}
        </Box>
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

export default OfflineFileImport;
