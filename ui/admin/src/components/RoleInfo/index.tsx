import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ModelUserRole } from '@/api/types';

interface RoleInfoProps {
  role: ModelUserRole;
  showDescription?: boolean;
}

const roleConfig = {
  [ModelUserRole.UserRoleUnknown]: {
    name: '未知',
    description: '',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleAdmin]: {
    name: '管理员',
    description: '平台管理员，主要负责平台相关的配置，所有功能所有权限',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleOperator]: {
    name: '客服运营',
    description: '平台内容的运营，主要对平台内容质量和响应速度负责，前台所有权限',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleUser]: {
    name: '用户',
    description: '普通用户',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleMax]: {
    name: '未知',
    description: '',
    color: 'default' as const,
  },
};

const RoleInfo: React.FC<RoleInfoProps> = ({ role, showDescription = false }) => {
  const config = roleConfig[role] || roleConfig[ModelUserRole.UserRoleUnknown];

  if (showDescription && config.description) {
    return (
      <Box>
        <Chip label={config.name} color={config.color} size="small" sx={{ mb: 0.5 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {config.description}
        </Typography>
      </Box>
    );
  }

  return (
    <Chip label={config.name} sx={{ borderRadius: '2px' }} color={config.color} size="small" />
  );
};

export default RoleInfo;
