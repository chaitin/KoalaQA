// 优化的MUI导入配置
// 这个文件集中管理MUI组件的导入，确保tree-shaking效果

// 基础组件
export { Box, Button, Stack, Typography, Container } from '@mui/material';
export { AppBar, Toolbar } from '@mui/material';
export { Avatar, Badge, Chip, Divider, Fab, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
export { Card, CardContent, CardHeader, Paper } from '@mui/material';
export { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
export { Drawer, Menu, MenuItem } from '@mui/material';
export { FormControl, FormHelperText, InputAdornment, OutlinedInput, TextField } from '@mui/material';
export { Autocomplete, Breadcrumbs, Link, Tabs, Tab } from '@mui/material';
export { CircularProgress, Skeleton, Snackbar } from '@mui/material';
export { Alert } from '@mui/material';
export { Tooltip } from '@mui/material';
export { ButtonBase } from '@mui/material';
export { GlobalStyles } from '@mui/material';

// 样式相关
export { styled, alpha } from '@mui/material/styles';
export type { SxProps, Theme } from '@mui/material/styles';
export { useTheme, useMediaQuery } from '@mui/material';

// 主题
export { createTheme } from '@mui/material/styles';
export { zhCN } from '@mui/material/locale';

// 图标 - 按需导入
export { default as SettingsIcon } from '@mui/icons-material/Settings';
export { default as CheckCircleIcon } from '@mui/icons-material/CheckCircle';
export { default as MoreVertIcon } from '@mui/icons-material/MoreVert';
export { default as SearchRoundedIcon } from '@mui/icons-material/SearchRounded';
export { default as ClearRoundedIcon } from '@mui/icons-material/ClearRounded';
export { default as CloseIcon } from '@mui/icons-material/Close';
export { default as NotificationsNoneOutlinedIcon } from '@mui/icons-material/NotificationsNoneOutlined';
export { default as SaveIcon } from '@mui/icons-material/Save';
export { default as SearchIcon } from '@mui/icons-material/Search';
export { default as PhotoCameraIcon } from '@mui/icons-material/PhotoCamera';
export { default as AccountTreeIcon } from '@mui/icons-material/AccountTree';
export { default as FolderIcon } from '@mui/icons-material/Folder';
export { default as DescriptionIcon } from '@mui/icons-material/Description';
export { default as ExpandMoreIcon } from '@mui/icons-material/ExpandMore';
export { default as ChevronRightIcon } from '@mui/icons-material/ChevronRight';
export { default as MenuIcon } from '@mui/icons-material/Menu';
export { default as ArrowBackIosIcon } from '@mui/icons-material/ArrowBackIos';
export { default as ArrowForwardIosIcon } from '@mui/icons-material/ArrowForwardIos';
export { default as ErrorIcon } from '@mui/icons-material/Error';
export { default as FullscreenIcon } from '@mui/icons-material/Fullscreen';
export { default as RemoveRedEyeOutlinedIcon } from '@mui/icons-material/RemoveRedEyeOutlined';
export { default as KeyboardArrowUp } from '@mui/icons-material/KeyboardArrowUp';
export { default as ErrorOutlineIcon } from '@mui/icons-material/ErrorOutline';

// Next.js集成
export { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
export { default as CssBaseline } from '@mui/material/CssBaseline';
export { ThemeProvider } from '@mui/material/styles';
