import dayjs from 'dayjs';
import { useState } from 'react';
import { Ellipsis, Modal } from '@c-x/ui';
import { Box, Button, Link, Stack } from '@mui/material';
import { DomainLicenseResp } from '@/api/types';
import ChangeLicense from './changeLicense';

interface LicenseModalProps {
  open: boolean;
  onClose: () => void;
  curVersion: string;
  latestVersion: string;
  license: DomainLicenseResp | undefined;
}

const AboutModal = ({
  open,
  onClose,
  curVersion,
  latestVersion,
  license
}: LicenseModalProps) => {

  const [openChangeLicense, setOpenChangeLicense] = useState(false);

  const editionText = (edition: any) => {
    if (edition === 0) {
      return '开源版'
    } else if (edition === 1) {
      return '联创版'
    } else if (edition === 2) {
      return '企业版'
    } else {
      return '未知'
    }
  }

  return (
    <Modal 
      title='关于 MonkeyCode'
      width={600}
      open={open}
      onCancel={onClose}
      footer={null}>
      <Stack direction={'column'} gap={2} sx={{
        fontSize: '14px'
      }}>
        <Stack direction={'row'}>
          <Box sx={{
            width: '120px'
          }}>当前版本</Box>
          <Box sx={{
            width: '120px',
            fontWeight: 700
          }}>{curVersion}</Box>
        </Stack>
        <Stack direction={'row'}>
          <Box sx={{
            width: '120px',
          }}>产品型号</Box>
          <Box sx={{
            mr: '20px'
          }}>{editionText(license?.edition)}</Box>
          <Link href="#" sx={{
            color: 'info.main',
            '&:hover': {
              fontWeight: 700
            }
          }}
          onClick={() => {
            setOpenChangeLicense(true);
          }}>切换授权</Link>
        </Stack>
        {license && license?.edition !== 0 && <Stack direction={'row'}>
          <Box sx={{
            width: '120px'
          }}>授权时间</Box>
          <Box sx={{
          }}>{dayjs.unix(license.started_at!).format('YYYY-MM-DD')} ~ {dayjs.unix(license.expired_at!).format('YYYY-MM-DD')}</Box>
        </Stack>}
      </Stack>
      <ChangeLicense 
        open={openChangeLicense}
        onClose={() => {setOpenChangeLicense(false)}} />
    </Modal>
  );
};

export default AboutModal;