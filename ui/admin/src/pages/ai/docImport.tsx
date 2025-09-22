import { MenuSelect } from '@c-x/ui';
import { useState } from 'react';

import { Box, Button, Stack, useTheme } from '@mui/material';

import ImportDoc from '@/components/ImportDoc';
import { ImportDocType } from '@/components/ImportDoc/type';
import { addOpacityToColor } from '@ctzhian/modelkit';

const DocImport = (props: { refresh: (params: any) => void }) => {
  const { refresh } = props;
  const theme = useTheme();
  const [urlOpen, setUrlOpen] = useState(false);
  const [key, setKey] = useState<ImportDocType>('URL');
  const close = () => {
    setUrlOpen(false);
  };
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
  return (
    <>
      <MenuSelect
        list={Object.entries(ImportContentWays).map(([key, value]) => ({
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
        context={
          <Button variant="contained" sx={{ position: 'absolute', top: '13px', right: '16px' }}>
            手动录入
          </Button>
        }
      />
      <ImportDoc type={key} open={urlOpen} refresh={refresh} onCancel={close} />
    </>
  );
};

export default DocImport;
