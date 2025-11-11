import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAdminForum } from '@/api/Forum';
import { ModelForumGroups, SvcForumRes } from '@/api/types';
import type { RootState } from '../index';

export type ForumItem = SvcForumRes & {
  groups?: ModelForumGroups[];
};

interface ForumState {
  forums: ForumItem[];
  loading: boolean;
  error: string | null;
}

const initialState: ForumState = {
  forums: [],
  loading: false,
  error: null,
};

// 异步获取论坛列表（带条件检查，避免重复请求）
export const fetchForums = createAsyncThunk(
  'forum/fetchForums',
  async () => {
    const response = await getAdminForum();
    return Array.isArray(response) ? response : [];
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      // 如果正在加载中或已有数据，则跳过请求
      if (state.forum.loading || state.forum.forums.length > 0) {
        return false;
      }
      return true;
    },
  }
);

// 强制刷新论坛列表（不受条件限制，用于保存后刷新）
export const refreshForums = createAsyncThunk(
  'forum/refreshForums',
  async () => {
    const response = await getAdminForum();
    return Array.isArray(response) ? response : [];
  }
);

const forumSlice = createSlice({
  name: 'forum',
  initialState,
  reducers: {
    clearForums: state => {
      state.forums = [];
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchForums.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchForums.fulfilled, (state, action) => {
        state.loading = false;
        state.forums = action.payload;
      })
      .addCase(fetchForums.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取板块列表失败';
      })
      .addCase(refreshForums.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshForums.fulfilled, (state, action) => {
        state.loading = false;
        state.forums = action.payload;
      })
      .addCase(refreshForums.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取板块列表失败';
      });
  },
});

export const { clearForums } = forumSlice.actions;
export default forumSlice.reducer;

