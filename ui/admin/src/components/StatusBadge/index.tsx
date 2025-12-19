import { Box, BoxProps } from '@mui/material';
import { ModelDocStatus } from '@/api';

export interface StatusBadgeProps extends Omit<BoxProps, 'children'> {
  status?: number;
  text?: string;
  variant?: 'applying' | 'pending' | 'success' | 'default';
  onClick?: () => void;
}

const StatusBadge = ({ status, text, variant, onClick, sx, ...props }: StatusBadgeProps) => {
  // 根据状态或变体确定显示内容
  const getDisplayContent = () => {
    if (text) return text;

    switch (status) {
      case ModelDocStatus.DocStatusUnknown:
        return '未应用';
      case ModelDocStatus.DocStatusPendingReview:
        return '待审核';
      case ModelDocStatus.DocStatusExportSuccess://'导出成功';
      case ModelDocStatus.DocStatusPendingExport:
      case ModelDocStatus.DocStatusAppling:
      case ModelDocStatus.DocStatusPendingApply:
        return '待应用';
      case ModelDocStatus.DocStatusApplySuccess:
        return '应用中';
      case ModelDocStatus.DocStatusExportFailed: // '导出失败';
      case ModelDocStatus.DocStatusApplyFailed:
        return '应用失败';
      default:
        return '未应用';
    }
  };

  // 根据状态或变体确定样式
  const getStatusStyles = () => {
    if (
      variant === 'applying' ||
      [
        ModelDocStatus.DocStatusAppling,
        ModelDocStatus.DocStatusPendingApply,
        ModelDocStatus.DocStatusApplySuccess,
      ].includes(status as ModelDocStatus)
    ) {
      return {
        backgroundColor: 'rgba(56, 96, 244, 0.10)',
        color: '#3860F4',
      };
    }

    if (
      variant === 'pending' ||
      [ModelDocStatus.DocStatusPendingReview, ModelDocStatus.DocStatusPendingExport].includes(
        status as ModelDocStatus
      )
    ) {
      return {
        backgroundColor: '#fff3cd',
        color: '#856404',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick
          ? {
              backgroundColor: '#ffeaa7',
            }
          : {},
      };
    }

    if (variant === 'success' || status === ModelDocStatus.DocStatusExportSuccess) {
      return {
        backgroundColor: 'rgba(46, 125, 50, 0.10)',
        color: '#2e7d32',
      };
    }

    if ([ModelDocStatus.DocStatusApplyFailed, ModelDocStatus.DocStatusExportFailed].includes(status as ModelDocStatus)) {
      return {
        backgroundColor: '#fdecea',
        color: '#d32f2f',
      };
    }

    // 默认样式
    return {
      backgroundColor: 'rgba(0, 0, 0, 0.06)',
      color: 'rgba(0, 0, 0, 0.6)',
    };
  };

  const displayText = getDisplayContent();
  const statusStyles = getStatusStyles();

  return (
    <Box
      component="span"
      onClick={onClick}
      sx={{
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        fontSize: '12px',
        display: 'inline-block',
        ...statusStyles,
        ...sx,
      }}
      {...props}
    >
      {displayText}
    </Box>
  );
};

export default StatusBadge;
