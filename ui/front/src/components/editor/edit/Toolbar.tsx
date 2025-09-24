import {
  AiGenerate2Icon,
  EditorToolbar,
  UseTiptapReturn,
} from '@ctzhian/tiptap';
import { Box } from '@mui/material';

interface ToolbarProps {
  editorRef: UseTiptapReturn;
  handleAiGenerate?: () => void;
}

const Toolbar = ({ editorRef, handleAiGenerate }: ToolbarProps) => {
  return (
    <Box
      sx={{
        width: 'auto',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 0.5,
        mx: 1,
      }}
    >
      <EditorToolbar editor={editorRef.editor} />
    </Box>
  );
};

export default Toolbar;
