import { ModelUserRole } from '@/api'

export const roleConfig = {
  [ModelUserRole.UserRoleUnknown]: {
    name: '未知',
    description: '',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleAdmin]: {
    name: '管理员',
    description: '平台管理员，主要负责平台相关的配置，所有功能所有权限',
    color: 'error' as const,
  },
  [ModelUserRole.UserRoleOperator]: {
    name: '客服运营',
    description: '平台内容的运营，主要对平台内容质量和响应速度负责，前台所有权限',
    color: 'primary' as const,
  },
  [ModelUserRole.UserRoleUser]: {
    name: '用户',
    description: '普通用户',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleGuest]: {
    name: '游客',
    description: '未激活用户，注册后待审核',
    color: 'default' as const,
  },
  [ModelUserRole.UserRoleMax]: {
    name: '未知',
    description: '',
    color: 'default' as const,
  },
}
