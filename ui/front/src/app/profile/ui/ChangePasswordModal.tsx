'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { putUser, ModelUserInfo, postUserLogout } from '@/api';
import { aesCbcEncrypt } from '@/utils/aes';
import { clearAuthData } from '@/api/httpClient';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user?: ModelUserInfo;
}

export default function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
  user,
}: ChangePasswordModalProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleClose = () => {
    if (loading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };
  const handleLogout = async () => {
    try {
      // 先调用后端登出API
      await postUserLogout()
    } catch (error) {
      console.warn('Backend logout failed:', error)
      // 即使后端登出失败，也要继续清理本地数据
    }
    
    try {
      // 使用统一的清除认证信息函数（不调用服务端登出API，因为已经调用过了）
      await clearAuthData(false)
      router.push('/login')
    } catch (error) {
      console.error('Failed to clear auth data:', error)
      // 即使清理失败，也要重定向到登录页
      router.push('/login')
    }
  }
  const handleSubmit = async () => {
    setError('');

    // 如果用户没有设置密码，则不需要验证旧密码
    const noPassword = (user as any)?.no_password === true;

    // 验证输入
    if (!noPassword && !currentPassword.trim()) {
      setError('请输入当前密码');
      return;
    }

    if (!newPassword.trim()) {
      setError('请输入新密码');
      return;
    }

    if (newPassword.length < 6) {
      setError('新密码长度不能少于6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (!noPassword && currentPassword === newPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        password: aesCbcEncrypt(newPassword?.trim()),
      };
      
      // 只有在用户已设置密码的情况下才需要发送旧密码
      if (!noPassword) {
        updateData.old_password = aesCbcEncrypt(currentPassword?.trim());
      }

      await putUser(updateData);

      onSuccess?.();
      handleClose();
      
      // 提示用户重新登录
      alert('密码修改成功，请重新登录');
      window.location.href = '/login';
    } catch (error: unknown) {
      console.error('修改密码失败:', error);
      setError((error as Error)?.message || '修改密码失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontSize: 16,mb: 1, }}>修改密码</DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!(user as any)?.no_password && (
            <TextField
              label="当前密码"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
              size='small'
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                      size="small"
                    >
                      {showCurrentPassword ? <VisibilityOff sx={{ fontSize: '16px' }} /> : <Visibility sx={{ fontSize: '16px' }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextField
            label="新密码"
            size='small'
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            required
            disabled={loading}
            helperText="密码长度不少于6位"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    size="small"
                  >
                    {showNewPassword ? <VisibilityOff sx={{ fontSize: '16px' }} /> : <Visibility sx={{ fontSize: '16px' }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="确认新密码"
            size='small'
            sx={{mt: '16px!important'}}
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            required
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff sx={{ fontSize: '16px' }} /> : <Visibility sx={{ fontSize: '16px' }} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? '修改中...' : '确认修改'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}