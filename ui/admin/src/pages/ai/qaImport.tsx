import { useEffect, useRef, useState } from "react";

import { Box, Button, IconButton, Stack, TextField } from "@mui/material";

import {
  getAdminKbKbIdQuestionQaId,
  postAdminKbKbIdQuestion,
  putAdminKbKbIdQuestionQaId,
  SvcDocListItem,
} from "@/api";
import Card from "@/components/card";
import { zodResolver } from "@hookform/resolvers/zod";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { useFullscreen } from "ahooks";
import { Message, Modal } from "ct-mui";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import z from "zod";

const schema = z.object({
  title: z.string().min(1, "必填").default(""),
  markdown: z.string().min(1, "必填").default(""),
  id: z.number().optional(),
});

const QaImport = (props: {
  refresh: (params: any) => void;
  editItem: SvcDocListItem | null;
  setEditItem: React.Dispatch<React.SetStateAction<SvcDocListItem | null>>;
}) => {
  const { refresh, editItem, setEditItem } = props;
  const ref = useRef(null);
  const [isFullscreen, { enterFullscreen, exitFullscreen }] = useFullscreen(
    ref,
    {
      pageFullscreen: true,
    }
  );

  const [showCreate, setShowCreate] = useState(false);
  const { id } = useParams();
  const kb_id = +(id || "0");
  const { register, formState, handleSubmit, reset, control, watch } = useForm({
    resolver: zodResolver(schema),
  });
  const creat = () => {
    setShowCreate(true);
  };
  const handleCancel = () => {
    setShowCreate(false);
    setEditItem(null);
    reset(schema.parse({}));
  };
  const handleEdit = async (data: z.infer<typeof schema>) => {
    await putAdminKbKbIdQuestionQaId(kb_id, data.id!, {
      title: data.title || "",
      markdown: data.markdown as any,
    });
    setEditItem(null);
    setShowCreate(false);
  };

  const handleOk = (data: z.infer<typeof schema>) => {
    postAdminKbKbIdQuestion(kb_id, data).then(() => {
      handleCancel();
      Message.success("保存成功");
      refresh({});
    });
  };
  useEffect(() => {
    if (editItem) {
      getAdminKbKbIdQuestionQaId(kb_id, editItem.id!).then((r) => {
        console.log(r);
        reset(r);
      });
      setShowCreate(true);
    }
  }, [editItem]);
  return (
    <>
      <Button
        variant="contained"
        onClick={creat}
        sx={{ position: "absolute", top: "13px", right: "16px" }}
      >
        手动录入
      </Button>
      <Modal
        open={showCreate}
        onCancel={handleCancel}
        title={
          <Stack
            direction="row"
            alignItems={"center"}
            justifyContent={"space-between"}
          >
            <Box>{editItem ? "编辑" : "手动录入"}</Box>

            <IconButton
              onClick={enterFullscreen}
              sx={{ position: "relative", top: "-9px", right: "30px" }}
            >
              <FullscreenIcon />
            </IconButton>
          </Stack>
        }
        width={800}
        footer={null}
      >
        <Stack component={Card} sx={{ position: "relative", pt: 2 }} ref={ref}>
          {isFullscreen && (
            <IconButton
              onClick={exitFullscreen}
              sx={{
                position: "relative",
                top: "-9px",
                right: "30px",
                alignSelf: "end",
                flexGrow: 0,
              }}
            >
              <FullscreenExitIcon />
            </IconButton>
          )}
          <TextField
            {...register("title")}
            label="名称"
            fullWidth
            error={Boolean(formState.errors.title?.message)}
            helperText={formState.errors.title?.message}
            slotProps={{
              inputLabel: {
                shrink: !!watch("title") || undefined,
              },
            }}
            sx={{
              mb: 2,
            }}
          />
          <Controller
            name="markdown"
            control={control}
            render={({ field, formState }) => (
              <TextField
                autoComplete="off"
                margin="normal"
                label={"回答"}
                placeholder={"请输入"}
                sx={{
                  position: "relative",
                  borderWidth: 2,
                  mt: 0,
                }}
                value={field.value}
                size="small"
                fullWidth
                error={Boolean(formState.errors.markdown?.message)}
                helperText={formState.errors.markdown?.message}
                multiline
                minRows={isFullscreen ? 30 : 8}
                onChange={field.onChange}
                slotProps={{
                  inputLabel: {
                    shrink: !!watch("markdown") || undefined,
                  },
                }}
              />
            )}
          />
          <Stack direction="row" justifyContent="end" spacing={2} mt={2}>
            <Button size="small" variant="text" onClick={handleCancel}>
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSubmit(editItem ? handleEdit : handleOk)}
            >
              确认
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
};

export default QaImport;
