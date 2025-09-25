import { MenuSelect } from '@ctzhian/ui';
import { useState } from 'react';

import { Box, Button, Stack, useTheme } from '@mui/material';

import ImportDoc from '@/components/ImportDoc';
import { ImportDocType } from '@/components/ImportDoc/type';
import { addOpacityToColor } from '@ctzhian/modelkit';

interface DocImportProps {
  refresh: (params: any) => void;
  // 添加新的 prop，用于指定允许的导入方式
  allowedImportTypes?: ImportDocType[];
}

const DocImport = (props: DocImportProps) => {
  const { refresh, allowedImportTypes } = props;
  const theme = useTheme();
  const [urlOpen, setUrlOpen] = useState(false);
  const [key, setKey] = useState<ImportDocType>('URL');

  const close = () => {
    setUrlOpen(false);
  };

  // 定义所有可用的导入方式
  const ImportContentWays = {
    OfflineFile: {
      label: '通过离线文件导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('OfflineFile');
      },
    },
    URL: {
      label: '通过 URL 导入',
      onClick: () => {
        setKey('URL');
        setUrlOpen(true);
      },
    },
    Sitemap: {
      label: '通过 Sitemap 导入',
      onClick: () => {
        setUrlOpen(true);
        setKey('Sitemap');
      },
    },
  };

  // 根据 allowedImportTypes 过滤导入方式
  const filteredImportWays = allowedImportTypes
    ? Object.entries(ImportContentWays).filter(([type]) =>
        allowedImportTypes.includes(type as ImportDocType)
      )
    : Object.entries(ImportContentWays);

  return (
    <>
      <MenuSelect
        list={filteredImportWays.map(([key, value]) => ({
          key,
          label: (
            <Box key={key}>
              <Stack
                direction={'row'}
                alignItems={'center'}
                gap={1}
                sx={{
                  fontSize: 14,
                  px: 2,
                  lineHeight: '40px',
                  height: 40,
                  width: 180,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  ':hover': {
                    bgcolor: addOpacityToColor(theme.palette.primary.main, 0.1),
                  },
                }}
                onClick={value.onClick}
              >
                {value.label}
              </Stack>
              {key === 'customDoc' && (
                <Box
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: theme.palette.divider,
                    my: 0.5,
                  }}
                />
              )}
            </Box>
          ),
        }))}
        context={<Button variant="contained">手动录入</Button>}
      />
      <ImportDoc type={key} open={urlOpen} refresh={refresh} onCancel={close} />
    </>
  );
};

export default DocImport;
