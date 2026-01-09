import { Box, BoxProps } from '@mui/material'

interface StatusDotIconProps extends Omit<BoxProps, 'sx'> {
  size?: number
  color?: string
}

/**
 * 状态标签圆点图标组件
 * 用于统一状态标签中的圆点样式
 */
const StatusDotIcon: React.FC<StatusDotIconProps> = ({ size = 4, color = '#fff', ...restProps }) => {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: color,
      }}
      {...restProps}
    />
  )
}

export default StatusDotIcon

