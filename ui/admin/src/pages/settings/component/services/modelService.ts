import {
  postAdminModel,
  postAdminModelCheck,
  postAdminModelProviderSupported,
  putAdminModelId,
  SvcMKCreateReq,
} from '@/api';
import type {
  ModelService as IModelService,
  Model,
  CheckModelReq as UICheckModelData,
  CreateModelReq as UICreateModelData,
  ListModelReq as UIGetModelNameData,
  ModelListItem as UIModelListItem,
  UpdateModelReq as UIUpdateModelData,
} from '@ctzhian/modelkit';

type WithRequiredAndDefault<T> = {
  [P in keyof T]-?: T[P] extends undefined ? string : T[P];
};
function transformObjectWithDefaults<T extends Record<string, any>>(
  obj: T,
  defaults: Partial<{ [K in keyof T]: T[K] extends undefined ? string : T[K] }> = {}
): WithRequiredAndDefault<T> {
  const result = {} as any;

  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      result[key] = obj[key] ?? defaults[key] ?? '';
    }
  }

  return result;
}
const convertToKit = (data: UICreateModelData): SvcMKCreateReq => {
  const _data = transformObjectWithDefaults(data);
  return {
    ..._data,
    model: data.model_name || '',
    type: (data.model_type as SvcMKCreateReq['type']) || 'chat',
  };
};
// ModelService 实现
export const modelService: IModelService = {
  async createModel(data: UICreateModelData) {
    const result = await postAdminModel(convertToKit(data));
    // 创建成功后返回模型数据
    const model: Model = data;
    return { model };
  },

  async listModel(data: UIGetModelNameData) {
    const result = await postAdminModelProviderSupported(convertToKit(data));

    const models: UIModelListItem[] = result.models
      ? result.models?.map(item => ({
          model: item.model || '',
        }))
      : [];
    const error: string = '';

    return { models, error };
  },

  async checkModel(data: UICheckModelData) {
    await postAdminModelCheck(convertToKit(data));

    const model: Model = data;
    const error: string = '';
    return { model, error };
  },

  async updateModel(data: UIUpdateModelData) {
    const res = await putAdminModelId({ id: data.id + '' }, convertToKit(data));
    // 更新成功后返回模型数据
    const model: Model = res;

    return { model };
  },
};
