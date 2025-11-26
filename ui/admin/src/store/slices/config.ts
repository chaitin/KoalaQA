
// import { KnowledgeBaseListItem } from '@/api';
import { createSlice } from '@reduxjs/toolkit';

export interface config {
  kb_id: number;
  // kbList: KnowledgeBaseListItem[];
  kb_c: boolean;
  modelStatus: boolean;
}
const initialState: config = {
  kb_id: 0,
  kb_c: false,
  modelStatus: false,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setKbId(state, { payload }) {
      state.kb_id = payload;
    },
    setKbC(state, { payload }) {
      state.kb_c = payload;
    },
    setModelStatus(state, { payload }) {
      state.modelStatus = payload;
    },
  },
});

export const {
  setKbId,
  setKbC,
  setModelStatus,
} = configSlice.actions;
export default configSlice.reducer;
