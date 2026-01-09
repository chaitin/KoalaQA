/* eslint-disable */
/* tslint:disable */
/**
 * Mock API for MessageNotifySub
 * 如果后端API还未实现，可以使用这个mock文件
 * 使用方法：在组件中导入时，如果后端API失败，可以临时使用mock版本
 */

import {
  ContextResponse,
  ModelListRes,
  ModelMessageNotifySub,
  ModelMessageNotifySubInfo,
  ModelMessageNotifySubType,
  SvcMessageNotifySubCreateReq,
} from './types';

// 模拟存储
let mockData: (ModelMessageNotifySub & { info?: ModelMessageNotifySubInfo })[] = [];

/**
 * Mock: 获取用户通知订阅列表
 */
export const getAdminSystemNotifySubMock = async (): Promise<
  ContextResponse & {
    data?: ModelListRes & {
      items?: (ModelMessageNotifySub & {
        info?: ModelMessageNotifySubInfo;
      })[];
    };
  }
> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    success: true,
    data: {
      items: mockData,
      total: mockData.length,
    },
  };
};

/**
 * Mock: 创建或更新用户通知订阅
 */
export const postAdminSystemNotifySubMock = async (
  req: SvcMessageNotifySubCreateReq
): Promise<ContextResponse & { data?: number }> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));

  const existingIndex = mockData.findIndex(
    item => item.type === req.type
  );

  const newItem: ModelMessageNotifySub & { info?: ModelMessageNotifySubInfo } = {
    id: existingIndex >= 0 ? mockData[existingIndex].id : Date.now(),
    type: req.type,
    enabled: req.enabled || false,
    info: req.info,
    created_at: existingIndex >= 0 ? mockData[existingIndex].created_at : Date.now(),
    updated_at: Date.now(),
  };

  if (existingIndex >= 0) {
    mockData[existingIndex] = newItem;
  } else {
    mockData.push(newItem);
  }

  return {
    success: true,
    data: newItem.id,
  };
};

