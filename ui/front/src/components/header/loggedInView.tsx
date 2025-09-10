import { AuthContext } from '@/components/authProvider';

import { Tooltip, Box } from '@mui/material';
import { Avatar } from '@/components/discussion';
import React, { useContext } from 'react';
import ProfilePanel from './profilePanel';

export interface LoggedInProps {
  user: any | null;
  verified: boolean;
}

const LoggedInView: React.FC = () => {
  const { user } = useContext(AuthContext);

  return (
    <Tooltip
      placement='bottom-end'
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: '#fff',
            boxShadow: '0px 20px 40px 0px rgba(0,28,85,0.06)',
            minWidth: '300px',
            padding: '20px',
            borderRadius: '8px',
          },
        },
        popper: {
          sx: {
            paddingRight: '24px',
            margin: '0px -24px 0px 0px !important',
          },
        },
      }}
      title={<ProfilePanel />}
    >
      <Avatar size={36} />
    </Tooltip>
  );
};

export default LoggedInView;
